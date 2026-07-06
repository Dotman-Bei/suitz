import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import type { WrapperPair } from "./types";
import { LOCAL_PAIRS, SEPOLIA_CHAIN_ID } from "@/config/pairs";
import { SEPOLIA_RPC } from "./network";
import { shortAddress } from "./format";

/**
 * ---------------------------------------------------------------------------
 * ONCHAIN SOURCE.
 *
 * The seed below mirrors the OFFICIAL cTokenMocks registered in the deployed
 * Sepolia Wrappers Registry (verified against docs.zama.org). In production
 * `fetchRegistry()` reads these straight from the registry contract:
 *
 *   registry @ REGISTRY_ADDRESS_SEPOLIA
 *     getTokenConfidentialTokenPairsLength() -> uint256
 *     getTokenConfidentialTokenPairsSlice(from, to) -> (erc20, confidential)[]
 *     getTokenConfidentialTokenPair(i) -> (erc20, confidential)
 *   then multicall name/symbol/decimals on each token to hydrate metadata.
 *
 * Token decimals here are placeholders for display until onchain hydration
 * replaces them; addresses are real.
 * ---------------------------------------------------------------------------
 */
export const REGISTRY_ADDRESS_SEPOLIA = "0x2f0750Bbb0A246059d80e94c454586a7F27a128e" as const;

/** Minimal ABI for the read + register paths (for the wagmi/viem integration). */
export const REGISTRY_ABI = [
  "function getTokenConfidentialTokenPairsLength() view returns (uint256)",
  "function getTokenConfidentialTokenPairsSlice(uint256 fromIndex, uint256 toIndex) view returns ((address erc20, address confidentialToken)[])",
  "function getTokenConfidentialTokenPairs() view returns ((address erc20, address confidentialToken)[])",
  "function getTokenConfidentialTokenPair(uint256 index) view returns (address erc20, address confidentialToken)",
  "function registerConfidentialToken(address erc20Token, address confidentialWrapper)",
] as const;

const OFFICIAL_PAIRS: WrapperPair[] = [
  pair("USDC", "USD Coin (Mock)", 6, "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF", "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639"),
  pair("USDT", "Tether USD (Mock)", 6, "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0", "0x4E7B06D78965594eB5EF5414c357ca21E1554491"),
  pair("WETH", "Wrapped Ether (Mock)", 18, "0xff54739b16576FA5402F211D0b938469Ab9A5f3F", "0x46208622DA27d91db4f0393733C8BA082ed83158"),
  pair("BRON", "Bron (Mock)", 18, "0xFf021fB13cA64e5354c62c954b949a88cfDEb25E", "0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891"),
  pair("ZAMA", "Zama (Mock)", 18, "0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57", "0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB"),
  pair("tGBP", "Test GBP (Mock)", 6, "0x93c931278A2aad1916783F952f94276eA5111442", "0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC"),
  pair("XAUt", "Tether Gold (Mock)", 6, "0x24377AE4AA0C45ecEe71225007f17c5D423dd940", "0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7"),
];

function pair(
  symbol: string,
  name: string,
  decimals: number,
  underlying: string,
  confidential: string,
): WrapperPair {
  return {
    id: `c${symbol}`.toLowerCase(),
    source: "official",
    chainId: SEPOLIA_CHAIN_ID,
    underlying: { address: underlying as `0x${string}`, symbol, name, decimals },
    confidential: {
      address: confidential as `0x${string}`,
      symbol: `c${symbol}`,
      name: `Confidential ${symbol}`,
      decimals,
    },
  };
}

/**
 * HYBRID RESOLUTION — the heart of "read onchain, augment with local config".
 *
 * 1. onchain pairs are the source of truth
 * 2. local pairs are merged on top
 * 3. if a local pair collides with an onchain one (same confidential address),
 *    the onchain (official) record wins — local never overrides official.
 */
export function resolvePairs(
  onchain: WrapperPair[] = OFFICIAL_PAIRS,
  local: WrapperPair[] = LOCAL_PAIRS,
): WrapperPair[] {
  const byConfidential = new Map<string, WrapperPair>();
  for (const p of local) byConfidential.set(p.confidential.address.toLowerCase(), p);
  for (const p of onchain) byConfidential.set(p.confidential.address.toLowerCase(), p); // official wins
  return [...byConfidential.values()].sort((a, b) => {
    if (a.source !== b.source) return a.source === "official" ? -1 : 1;
    return a.confidential.symbol.localeCompare(b.confidential.symbol);
  });
}

/* ---------------------------------------------------------------------------
 * REAL ONCHAIN READ
 * ------------------------------------------------------------------------- */
const publicClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) });
const registryAbi = parseAbi(REGISTRY_ABI);
const tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

/** Reads the registry contract, then hydrates token metadata via multicall. */
async function readOnchainPairs(): Promise<WrapperPair[]> {
  const raw = (await publicClient.readContract({
    address: REGISTRY_ADDRESS_SEPOLIA,
    abi: registryAbi,
    functionName: "getTokenConfidentialTokenPairs",
  })) as readonly { erc20: `0x${string}`; confidentialToken: `0x${string}` }[];

  if (!raw?.length) return OFFICIAL_PAIRS;

  const calls = raw.flatMap((p) => [
    { address: p.erc20, abi: tokenAbi, functionName: "symbol" } as const,
    { address: p.erc20, abi: tokenAbi, functionName: "name" } as const,
    { address: p.erc20, abi: tokenAbi, functionName: "decimals" } as const,
    { address: p.confidentialToken, abi: tokenAbi, functionName: "symbol" } as const,
    { address: p.confidentialToken, abi: tokenAbi, functionName: "name" } as const,
    { address: p.confidentialToken, abi: tokenAbi, functionName: "decimals" } as const,
  ]);

  const meta = await publicClient.multicall({ contracts: calls, allowFailure: true });
  const seedByConf = new Map(OFFICIAL_PAIRS.map((p) => [p.confidential.address.toLowerCase(), p]));

  return raw.map((p, i) => {
    const base = i * 6;
    const at = (k: number): unknown => {
      const m = meta[base + k];
      return m && m.status === "success" ? m.result : undefined;
    };
    const seed = seedByConf.get(p.confidentialToken.toLowerCase());
    const uSymbol = (at(0) as string | undefined) ?? seed?.underlying.symbol ?? shortAddress(p.erc20);
    const uName = (at(1) as string | undefined) ?? seed?.underlying.name ?? uSymbol;
    const decimals = Number(at(2) ?? seed?.underlying.decimals ?? 18);
    const cSymbol = (at(3) as string | undefined) ?? seed?.confidential.symbol ?? `c${uSymbol}`;
    const cName = (at(4) as string | undefined) ?? seed?.confidential.name ?? `Confidential ${uSymbol}`;
    // ERC-7984 wrappers expose their own (uint64-safe) decimals, distinct from
    // the underlying ERC-20's — read it rather than mirroring the ERC-20.
    const cDecimals = Number(at(5) ?? seed?.confidential.decimals ?? decimals);

    return {
      id: cSymbol.toLowerCase(),
      source: "official" as const,
      chainId: SEPOLIA_CHAIN_ID,
      underlying: { address: p.erc20, symbol: uSymbol, name: uName, decimals },
      confidential: { address: p.confidentialToken, symbol: cSymbol, name: cName, decimals: cDecimals },
    };
  });
}

/**
 * Live registry read with graceful degradation: if the onchain call fails
 * (RPC down, ABI drift), fall back to the verified seed so the app never
 * shows an empty registry.
 */
export async function fetchRegistry(): Promise<WrapperPair[]> {
  try {
    const onchain = await readOnchainPairs();
    return resolvePairs(onchain, LOCAL_PAIRS);
  } catch (err) {
    console.warn("[suitz] onchain registry read failed — using verified seed:", err);
    return resolvePairs(OFFICIAL_PAIRS, LOCAL_PAIRS);
  }
}

export { OFFICIAL_PAIRS };
