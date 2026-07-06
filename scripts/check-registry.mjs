/**
 * Coverage cross-check: does the live Sepolia Wrappers Registry still match the
 * in-repo seed (OFFICIAL_PAIRS in lib/registry.ts + EXPECTED_OFFICIAL in
 * lib/registry.test.ts)?
 *
 * Run this before submission (and whenever Zama may have registered new mocks):
 *
 *   node scripts/check-registry.mjs
 *   NEXT_PUBLIC_SEPOLIA_RPC=https://<keyed-rpc> node scripts/check-registry.mjs
 *
 * It prints every valid onchain pair, then flags:
 *   • NEW onchain — present live but missing from the seed  → add it
 *   • seed-only   — in the seed but not returned live        → revoked? verify
 */
import { createPublicClient, http, parseAbi, getAddress } from "viem";
import { sepolia } from "viem/chains";

const RPC =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC ??
  process.env.SEPOLIA_RPC ??
  "https://ethereum-sepolia-rpc.publicnode.com";

const REGISTRY = "0x2f0750Bbb0A246059d80e94c454586a7F27a128e";

// Mirror of OFFICIAL_PAIRS (lib/registry.ts), keyed by confidential address.
// Keep this in sync when you update the seed.
const SEED = {
  "0x7c5bf43b851c1dff1a4fee8db225b87f2c223639": "cUSDCMock",
  "0x4e7b06d78965594eb5ef5414c357ca21e1554491": "cUSDTMock",
  "0x46208622da27d91db4f0393733c8ba082ed83158": "cWETHMock",
  "0xaa5612fa27c927a0c7961f5aefee5ba3a0f9c891": "cBRONMock",
  "0xf2d628d2598af4eaf94cb76a437ff86ca78ffbfb": "cZAMAMock",
  "0xfce5c7069c5525ef6c8c2b2e35a745ba20a2f7cc": "ctGBPMock",
  "0xe4fcf848739845bc81dee1d5352cf3844f0a60c7": "cXAUtMock",
  "0x167dc962808b32cfffc7e14b5018c0be06a3a208": "ctGBP",
};

const registryAbi = parseAbi([
  "function getTokenConfidentialTokenPairs() view returns ((address tokenAddress, address confidentialTokenAddress, bool isValid)[])",
]);
const tokenAbi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

const client = createPublicClient({ chain: sepolia, transport: http(RPC) });

console.log(`registry: ${REGISTRY}`);
console.log(`rpc:      ${RPC}\n`);

const all = await client.readContract({
  address: REGISTRY,
  abi: registryAbi,
  functionName: "getTokenConfidentialTokenPairs",
});
const valid = all.filter((p) => p.isValid);
console.log(`onchain pairs: ${all.length} total, ${valid.length} valid\n`);

const meta = await client.multicall({
  allowFailure: true,
  contracts: valid.flatMap((p) => [
    { address: p.tokenAddress, abi: tokenAbi, functionName: "symbol" },
    { address: p.tokenAddress, abi: tokenAbi, functionName: "decimals" },
    { address: p.confidentialTokenAddress, abi: tokenAbi, functionName: "symbol" },
  ]),
});
const val = (i) => (meta[i]?.status === "success" ? meta[i].result : "?");

const liveByConf = new Map();
valid.forEach((p, i) => {
  const uSym = val(i * 3);
  const uDec = val(i * 3 + 1);
  const cSym = val(i * 3 + 2);
  const conf = getAddress(p.confidentialTokenAddress).toLowerCase();
  liveByConf.set(conf, cSym);
  const known = SEED[conf] ? "  " : "NEW";
  console.log(
    `  ${known}  ${String(uSym).padEnd(10)} (${String(uDec).padEnd(2)} dec)  →  ${String(cSym).padEnd(11)}  ${p.confidentialTokenAddress}`,
  );
});

const newOnchain = [...liveByConf.keys()].filter((c) => !SEED[c]);
const seedOnly = Object.keys(SEED).filter((c) => !liveByConf.has(c));

console.log("");
if (!newOnchain.length && !seedOnly.length) {
  console.log("✓ In sync — the seed matches the live registry. No action needed.");
} else {
  if (newOnchain.length) {
    console.log("⚠ NEW onchain (add to OFFICIAL_PAIRS + EXPECTED_OFFICIAL):");
    for (const c of newOnchain) console.log(`   ${liveByConf.get(c)}  ${c}`);
  }
  if (seedOnly.length) {
    console.log("⚠ seed-only (not returned live — revoked or moved? verify):");
    for (const c of seedOnly) console.log(`   ${SEED[c]}  ${c}`);
  }
}
