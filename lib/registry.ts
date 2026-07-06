import { createPublicClient, http, parseAbi, isAddress, getAddress } from "viem";
import { sepolia } from "viem/chains";
import type { Address, LocalPairInput, PairSource, WrapperPair } from "./types";
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
 *     getTokenConfidentialTokenPairs() -> (address tokenAddress,
 *                                          address confidentialTokenAddress,
 *                                          bool isValid)[]
 *   then multicall name/symbol/decimals on each token to hydrate metadata.
 *
 * The seed below is only the graceful-degradation fallback (RPC down / ABI
 * drift). Live, every field is read onchain — including the confidential
 * wrapper's own decimals, which the ERC-7984 mocks cap at 6 to stay uint64-safe
 * regardless of the underlying ERC-20's decimals.
 * ---------------------------------------------------------------------------
 */
export const REGISTRY_ADDRESS_SEPOLIA = "0x2f0750Bbb0A246059d80e94c454586a7F27a128e" as const;

/**
 * Minimal ABI for the read + register paths (for the wagmi/viem integration).
 *
 * The registry stores each entry as a 3-field `TokenWrapperPair`
 * `(address tokenAddress, address confidentialTokenAddress, bool isValid)` —
 * verified against the deployed, Sourcify-verified implementation
 * (ConfidentialTokenWrappersRegistry @ 0x50C2…Bdb59). The `isValid` flag is
 * NOT optional: a revoked pair stays in the array with `isValid=false`, and
 * omitting the field silently mis-decodes the whole array (every 3rd word
 * shifts into the next tuple). `registerConfidentialToken` is `onlyOwner` and
 * requires the confidential token to advertise ERC-165 `supportsInterface`
 * for the ERC-7984 interface id (0x4958f2a4).
 */
export const REGISTRY_ABI = [
  "function getTokenConfidentialTokenPairsLength() view returns (uint256)",
  "function getTokenConfidentialTokenPairsSlice(uint256 fromIndex, uint256 toIndex) view returns ((address tokenAddress, address confidentialTokenAddress, bool isValid)[])",
  "function getTokenConfidentialTokenPairs() view returns ((address tokenAddress, address confidentialTokenAddress, bool isValid)[])",
  "function getTokenConfidentialTokenPair(uint256 index) view returns (address tokenAddress, address confidentialTokenAddress, bool isValid)",
  "function getConfidentialTokenAddress(address tokenAddress) view returns (bool, address)",
  "function getTokenAddress(address confidentialTokenAddress) view returns (bool, address)",
  "function registerConfidentialToken(address tokenAddress, address confidentialTokenAddress)",
] as const;

/** Confidential ERC-7984 wrappers cap decimals at 6 to stay uint64-safe. */
const CONFIDENTIAL_DECIMALS = 6;

/**
 * Fallback seed — a faithful mirror of the 8 valid pairs onchain (symbols,
 * names, and decimals verified live). Confidential wrappers all report 6
 * decimals (uint64-safe) regardless of the underlying's; underlying decimals
 * vary. Symbols/ids match the onchain values, so a seed row and its live
 * counterpart resolve to the same `id`.
 */
const OFFICIAL_PAIRS: WrapperPair[] = [
  pair("USDCMock", "USD Coin (Mock)", 6, "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF", "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639"),
  pair("USDTMock", "Tether USD (Mock)", 6, "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0", "0x4E7B06D78965594eB5EF5414c357ca21E1554491"),
  pair("WETHMock", "Wrapped Ether (Mock)", 18, "0xff54739b16576FA5402F211D0b938469Ab9A5f3F", "0x46208622DA27d91db4f0393733C8BA082ed83158"),
  pair("BRONMock", "Bron (Mock)", 18, "0xFf021fB13cA64e5354c62c954b949a88cfDEb25E", "0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891"),
  pair("ZAMAMock", "Zama (Mock)", 18, "0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57", "0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB"),
  pair("tGBPMock", "tGBP (Mock)", 18, "0x93c931278A2aad1916783F952f94276eA5111442", "0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC"),
  pair("XAUtMock", "XAUt (Mock)", 6, "0x24377AE4AA0C45ecEe71225007f17c5D423dd940", "0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7"),
  pair("tGBP", "tGBP", 18, "0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3", "0x167DC962808B32CFFFc7e14B5018c0bE06A3A208"),
];

function pair(
  symbol: string,
  name: string,
  underlyingDecimals: number,
  underlying: string,
  confidential: string,
): WrapperPair {
  return {
    id: `c${symbol}`.toLowerCase(),
    source: "official",
    chainId: SEPOLIA_CHAIN_ID,
    underlying: { address: underlying as `0x${string}`, symbol, name, decimals: underlyingDecimals },
    confidential: {
      address: confidential as `0x${string}`,
      symbol: `c${symbol}`,
      name: `Confidential ${symbol}`,
      decimals: CONFIDENTIAL_DECIMALS,
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
  local: WrapperPair[] = [],
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

/** ERC-7984 wrapper surface we use to derive + validate a pair from one address. */
const wrapperAbi = parseAbi([
  "function underlying() view returns (address)",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
]);

/** The ERC-7984 interface id (EIP-7984); the registry gates registration on it. */
const ERC7984_INTERFACE_ID = "0x4958f2a4" as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Reads the registry contract, then hydrates token metadata via multicall. */
async function readOnchainPairs(): Promise<WrapperPair[]> {
  const all = (await publicClient.readContract({
    address: REGISTRY_ADDRESS_SEPOLIA,
    abi: registryAbi,
    functionName: "getTokenConfidentialTokenPairs",
  })) as readonly {
    tokenAddress: `0x${string}`;
    confidentialTokenAddress: `0x${string}`;
    isValid: boolean;
  }[];

  // Revoked pairs remain in the array with isValid=false; drop them so the UI
  // never surfaces a revoked pair as a live official one.
  const raw = all?.filter((p) => p.isValid) ?? [];
  if (!raw.length) return OFFICIAL_PAIRS;

  const calls = raw.flatMap((p) => [
    { address: p.tokenAddress, abi: tokenAbi, functionName: "symbol" } as const,
    { address: p.tokenAddress, abi: tokenAbi, functionName: "name" } as const,
    { address: p.tokenAddress, abi: tokenAbi, functionName: "decimals" } as const,
    { address: p.confidentialTokenAddress, abi: tokenAbi, functionName: "symbol" } as const,
    { address: p.confidentialTokenAddress, abi: tokenAbi, functionName: "name" } as const,
    { address: p.confidentialTokenAddress, abi: tokenAbi, functionName: "decimals" } as const,
  ]);

  const meta = await publicClient.multicall({ contracts: calls, allowFailure: true });
  const seedByConf = new Map(OFFICIAL_PAIRS.map((p) => [p.confidential.address.toLowerCase(), p]));

  return raw.map((p, i) => {
    const base = i * 6;
    const at = (k: number): unknown => {
      const m = meta[base + k];
      return m && m.status === "success" ? m.result : undefined;
    };
    const seed = seedByConf.get(p.confidentialTokenAddress.toLowerCase());
    const uSymbol = (at(0) as string | undefined) ?? seed?.underlying.symbol ?? shortAddress(p.tokenAddress);
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
      underlying: { address: p.tokenAddress, symbol: uSymbol, name: uName, decimals },
      confidential: { address: p.confidentialTokenAddress, symbol: cSymbol, name: cName, decimals: cDecimals },
    };
  });
}

/* ---------------------------------------------------------------------------
 * EXTENSIBILITY — turn a single confidential address into a full pair.
 *
 * The same code path powers three "add a pair" routes:
 *   1. the in-app "Add pair" modal (session-local, persisted to localStorage)
 *   2. config/pairs.ts LOCAL_PAIRS (committed dev pairs)
 *   3. onchain registration (which then arrives via readOnchainPairs as official)
 * All you supply is the ERC-7984 wrapper address — underlying + metadata are
 * derived onchain, so a local pair can never carry wrong metadata.
 * ------------------------------------------------------------------------- */

export type PairProbe =
  | { ok: true; pair: WrapperPair }
  | { ok: false; error: string };

/**
 * Validate + hydrate a confidential (ERC-7984) address into a WrapperPair.
 * Derives the underlying via `underlying()`, confirms the address behaves like
 * an ERC-7984 token, and reads all metadata onchain. Returns a friendly error
 * (never throws) so callers can surface it directly in the UI.
 */
export async function probeConfidentialToken(
  confidentialInput: string,
  opts: { source?: PairSource; underlying?: Address; note?: string } = {},
): Promise<PairProbe> {
  if (!isAddress(confidentialInput)) {
    return { ok: false, error: "That doesn't look like a valid address." };
  }
  const confidential = getAddress(confidentialInput);
  const source = opts.source ?? "local";

  const [underlyingRes, supportsRes] = await Promise.all([
    publicClient
      .readContract({ address: confidential, abi: wrapperAbi, functionName: "underlying" })
      .catch(() => undefined),
    publicClient
      .readContract({
        address: confidential,
        abi: wrapperAbi,
        functionName: "supportsInterface",
        args: [ERC7984_INTERFACE_ID],
      })
      .catch(() => undefined),
  ]);

  const derived =
    underlyingRes && underlyingRes !== ZERO_ADDRESS ? (underlyingRes as Address) : undefined;
  const underlying = opts.underlying ?? derived;
  if (!underlying) {
    return {
      ok: false,
      error: "Couldn't read underlying(). Is this an ERC-7984 wrapper on Sepolia?",
    };
  }

  const calls = [
    { address: underlying, abi: tokenAbi, functionName: "symbol" },
    { address: underlying, abi: tokenAbi, functionName: "name" },
    { address: underlying, abi: tokenAbi, functionName: "decimals" },
    { address: confidential, abi: tokenAbi, functionName: "symbol" },
    { address: confidential, abi: tokenAbi, functionName: "name" },
    { address: confidential, abi: tokenAbi, functionName: "decimals" },
  ] as const;
  const meta = await publicClient.multicall({ contracts: calls, allowFailure: true });
  const at = (k: number): unknown => (meta[k]?.status === "success" ? meta[k].result : undefined);

  // If it neither advertises ERC-7984 nor responds as a token, reject it.
  if (supportsRes !== true && at(3) === undefined && at(5) === undefined) {
    return { ok: false, error: "This address doesn't respond as an ERC-7984 token." };
  }

  const uSymbol = (at(0) as string | undefined) ?? shortAddress(underlying);
  const uName = (at(1) as string | undefined) ?? uSymbol;
  const uDecimals = Number(at(2) ?? 18);
  const cSymbol = (at(3) as string | undefined) ?? `c${uSymbol}`;
  const cName = (at(4) as string | undefined) ?? `Confidential ${uSymbol}`;
  const cDecimals = Number(at(5) ?? CONFIDENTIAL_DECIMALS);

  return {
    ok: true,
    pair: {
      id: cSymbol.toLowerCase(),
      source,
      chainId: SEPOLIA_CHAIN_ID,
      underlying: { address: underlying, symbol: uSymbol, name: uName, decimals: uDecimals },
      confidential: { address: confidential, symbol: cSymbol, name: cName, decimals: cDecimals },
      note: opts.note,
    },
  };
}

/** Hydrate slim local inputs → full pairs, dropping any that fail to resolve. */
async function hydrateLocalPairs(inputs: LocalPairInput[]): Promise<WrapperPair[]> {
  const results = await Promise.all(
    inputs.map((inp) =>
      probeConfidentialToken(inp.confidential, {
        source: "local",
        underlying: inp.underlying,
        note: inp.note,
      }),
    ),
  );
  return results.flatMap((r, i) => {
    if (r.ok) return [r.pair];
    console.warn("[suitz] skipping invalid local pair", inputs[i], r.error);
    return [];
  });
}

/* ---------------------------------------------------------------------------
 * SESSION-LOCAL PAIRS — added live via the "Add pair" modal, persisted to
 * localStorage so a judge can add a pair on the deployed URL without a rebuild.
 * ------------------------------------------------------------------------- */
const SESSION_KEY = "suitz.localPairs.v1";

export function loadSessionPairs(): LocalPairInput[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as LocalPairInput[]) : [];
  } catch {
    return [];
  }
}

function writeSessionPairs(pairs: LocalPairInput[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(pairs));
}

/** Add (or update) a session-local pair, de-duped by confidential address. */
export function saveSessionPair(input: LocalPairInput): void {
  const key = input.confidential.toLowerCase();
  const next = loadSessionPairs().filter((p) => p.confidential.toLowerCase() !== key);
  next.push(input);
  writeSessionPairs(next);
}

/** Remove a session-local pair by its confidential address. */
export function removeSessionPair(confidential: string): void {
  const key = confidential.toLowerCase();
  writeSessionPairs(loadSessionPairs().filter((p) => p.confidential.toLowerCase() !== key));
}

/**
 * Live registry read with graceful degradation. Merges three sources through
 * one hybrid resolver: onchain (source of truth) → config LOCAL_PAIRS →
 * session-local pairs. On address collision the onchain record always wins.
 * If the onchain call fails (RPC down, ABI drift), fall back to the verified
 * seed so the app never shows an empty registry.
 */
export async function fetchRegistry(): Promise<WrapperPair[]> {
  const localInputs = [...LOCAL_PAIRS, ...loadSessionPairs()];
  const [onchain, local] = await Promise.all([
    readOnchainPairs().catch((err) => {
      console.warn("[suitz] onchain registry read failed — using verified seed:", err);
      return OFFICIAL_PAIRS;
    }),
    hydrateLocalPairs(localInputs),
  ]);
  return resolvePairs(onchain, local);
}

export { OFFICIAL_PAIRS };
