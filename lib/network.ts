/**
 * Sepolia RPC endpoint. Override with NEXT_PUBLIC_SEPOLIA_RPC for a keyed provider.
 * `|| ` (not `??`) so a present-but-empty env var — `NEXT_PUBLIC_SEPOLIA_RPC=` — falls
 * back to the public default instead of passing "" to the SDK ("Invalid network URL").
 */
export const SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC?.trim() || "https://ethereum-sepolia-rpc.publicnode.com";

/**
 * Public repo URL — set NEXT_PUBLIC_REPO_URL to enable the one-click "suggest a
 * pair" GitHub flow in the Add-pair modal. Left empty, the modal still offers a
 * copy-paste config snippet; it just hides the GitHub button rather than link
 * somewhere broken.
 */
export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL ?? "";
