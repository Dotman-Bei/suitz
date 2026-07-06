/**
 * Core domain types for suitz.
 *
 * These describe the live data the app runs on: the onchain WrappersRegistry
 * yields (underlying ERC-20, confidential ERC-7984) tuples, which we hydrate
 * with token metadata via multicall (see lib/registry.ts). The UI is written
 * entirely against these types, so contract calls stay isolated behind the
 * lib/ layer and never leak wagmi/viem specifics into components.
 */

export type Address = `0x${string}`;

export type PairSource = "official" | "local";

export interface TokenMeta {
  address: Address;
  /** e.g. "USDC" for the underlying, "cUSDC" for the confidential token */
  symbol: string;
  name: string;
  decimals: number;
}

export interface WrapperPair {
  /** stable id = confidential token symbol, lowercased */
  id: string;
  source: PairSource;
  chainId: number;
  /** the standard ERC-20 */
  underlying: TokenMeta;
  /** the confidential ERC-7984 wrapper */
  confidential: TokenMeta;
  /** optional free-text note for local/dev pairs (why it exists) */
  note?: string;
}

/**
 * Slim input for the LOCAL override layer and the in-app "Add pair" flow.
 * Only the confidential (ERC-7984) address is required: the underlying ERC-20
 * is derived onchain from the wrapper's `underlying()` getter, and all metadata
 * (symbol / name / decimals, both sides) is hydrated via the same multicall
 * path used for official pairs — so a local pair can never carry stale or wrong
 * metadata. Pass `underlying` only to override the derived address.
 */
export interface LocalPairInput {
  confidential: Address;
  underlying?: Address;
  note?: string;
}

/** Lifecycle of an encrypted balance handle in the UI. */
export type RevealState = "encrypted" | "decrypting" | "revealed" | "error";

/**
 * On FHEVM a balance is an opaque handle until the wallet authorises a
 * user-decryption via EIP-712. The UI tracks that lifecycle explicitly.
 */
export interface ConfidentialBalance {
  /** the ciphertext handle returned by confidentialBalanceOf(user) */
  handle: string;
  state: RevealState;
  /** cleartext, only present once revealed */
  revealed?: string;
}

/** Wrap is synchronous-ish; unwrap requires the decryption oracle round-trip. */
export type FlowStage =
  | "idle"
  | "approving"
  | "approved"
  | "wrapping"
  | "encrypting"
  | "submitting"
  | "finalizing" // waiting on the FHEVM decryption oracle callback
  | "settled"
  | "error";

export interface NetworkInfo {
  chainId: number;
  name: string;
  supported: boolean;
}
