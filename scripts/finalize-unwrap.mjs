/**
 * Recover a stuck unwrap.
 *
 * An unwrap is two steps: unwrap() burns the ERC-7984 and queues the amount for
 * decryption; finalizeUnwrap() releases the ERC-20. If the second step never
 * ran, the burned balance sits claimable on the wrapper. This script fetches the
 * public decryption (value + KMS proof) for the queued handle and finalizes it.
 *
 * finalizeUnwrap is permissionless — the ERC-20 goes to the recipient recorded
 * at unwrap time, so ANY funded account can submit it on the owner's behalf.
 *
 * Usage:
 *   # from the unwrap tx hash (extracts the handle automatically):
 *   node scripts/finalize-unwrap.mjs --tx 0x<unwrapTxHash>
 *   # or from a known handle:
 *   node scripts/finalize-unwrap.mjs --handle 0x<euint64Handle> --wrapper 0x<wrapper>
 *
 *   # print calldata only (default) — paste into your wallet / Etherscan:
 *   node scripts/finalize-unwrap.mjs --tx 0x...
 *   # or submit directly with a funded key (testnet only):
 *   PRIVATE_KEY=0x... node scripts/finalize-unwrap.mjs --tx 0x... --send
 */
import { ZamaSDK, createConfig, memoryStorage } from "@zama-fhe/sdk";
import { node } from "@zama-fhe/sdk/node";
import { ViemProvider } from "@zama-fhe/sdk/viem";
import { sepolia as sepoliaFhe } from "@zama-fhe/sdk/chains";
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  parseAbi,
  decodeEventLog,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const RPC = process.env.SEPOLIA_RPC ?? "https://sepolia.drpc.org";
const WRAPPER_ABI = parseAbi([
  "function finalizeUnwrap(bytes32 handle, uint64 amount, bytes signatures)",
  "function underlying() view returns (address)",
  "function decimals() view returns (uint8)",
  "event UnwrapRequested(address indexed to, bytes32 indexed requestId, bytes32 handle)",
]);

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name) => process.argv.includes(`--${name}`);

const client = createPublicClient({ chain: sepolia, transport: http(RPC) });

let handle = arg("handle");
let wrapper = arg("wrapper");

// derive handle + wrapper from an unwrap tx if given
const txHash = arg("tx");
if (txHash) {
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: WRAPPER_ABI, data: log.data, topics: log.topics });
      if (ev.eventName === "UnwrapRequested") {
        handle = ev.args.handle ?? ev.args.requestId;
        wrapper = log.address;
        break;
      }
    } catch {
      /* not the event */
    }
  }
  if (!handle) throw new Error(`No UnwrapRequested event found in ${txHash}`);
}

if (!handle || !wrapper) {
  throw new Error("Provide --tx <unwrapTxHash>, or --handle <handle> --wrapper <wrapper>.");
}
console.log("wrapper:", wrapper);
console.log("handle: ", handle);

// 1 — public decryption: cleartext amount + KMS signatures. Read-only SDK
// (provider, no signer) — decryptPublicValues needs no wallet.
const sdk = new ZamaSDK(
  createConfig({
    chains: [{ ...sepoliaFhe, network: RPC }],
    provider: new ViemProvider({ publicClient: client }),
    storage: memoryStorage,
    relayers: { [sepoliaFhe.id]: node() },
  }),
);
console.log("fetching public decryption…");
let amount, proof;
try {
  const res = await sdk.decryption.decryptPublicValues([handle]);
  amount = BigInt(Object.values(res.clearValues)[0]);
  proof = res.decryptionProof;
} finally {
  sdk.terminate(); // stop the worker pool so the process can exit
}

const underlying = await client.readContract({ address: wrapper, abi: WRAPPER_ABI, functionName: "underlying" });
const confDec = await client.readContract({ address: wrapper, abi: WRAPPER_ABI, functionName: "decimals" });
console.log(`decrypted amount: ${amount} (${formatUnits(amount, Number(confDec))} tokens)`);

const data = encodeFunctionData({ abi: WRAPPER_ABI, functionName: "finalizeUnwrap", args: [handle, amount, proof] });

// 2 — simulate to be sure it won't revert
const from = process.env.PRIVATE_KEY ? privateKeyToAccount(process.env.PRIVATE_KEY).address : "0x000000000000000000000000000000000000dEaD";
await client.call({ account: from, to: wrapper, data });
console.log("simulation OK — finalizeUnwrap will succeed. underlying:", underlying);

if (flag("send")) {
  if (!process.env.PRIVATE_KEY) throw new Error("--send requires PRIVATE_KEY env");
  const account = privateKeyToAccount(process.env.PRIVATE_KEY);
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });
  const hash = await wallet.sendTransaction({ to: wrapper, data });
  console.log("submitted finalizeUnwrap:", hash);
  const r = await client.waitForTransactionReceipt({ hash });
  console.log("status:", r.status);
} else {
  console.log("\n--- send this transaction to release your tokens ---");
  console.log("to:      ", wrapper);
  console.log("value:   0");
  console.log("calldata:", data);
  console.log("\n(re-run with --send and PRIVATE_KEY set to submit automatically)");
}
