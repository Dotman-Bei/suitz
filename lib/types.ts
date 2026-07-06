/**
 * Core domain types for suitz.
 *
 * These mirror what the live integration will produce: the onchain
 * WrappersRegistry yields (underlying ERC-20, confidential ERC-7984) tuples,
 * which we hydrate with token metadata. The UI is written against these types
 * so the data layer can be swapped from mock → wagmi/viem without touching
 * components.
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
