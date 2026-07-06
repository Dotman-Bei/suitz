import { publicClient } from "./viemClient";
import { WRAPPER_ABI } from "./abis";

/** Cache of confidential (ERC-7984) wrapper decimals, keyed by wrapper address. */
const decimalsCache = new Map<string, number>();

/**
 * ERC-7984 balances are euint64, so each wrapper exposes its OWN decimals
 * (capped so amounts fit 64 bits) — distinct from the underlying ERC-20's, which
 * is what the registry metadata mirrors. Read once per wrapper, then cached for
 * the session so the unwrap/decrypt paths don't re-read on every attempt.
 */
export async function getConfidentialDecimals(wrapper: `0x${string}`): Promise<number> {
  const key = wrapper.toLowerCase();
  const cached = decimalsCache.get(key);
  if (cached !== undefined) return cached;
  const d = Number(
    await publicClient.readContract({
      address: wrapper,
      abi: WRAPPER_ABI,
      functionName: "decimals",
    }),
  );
  decimalsCache.set(key, d);
  return d;
}
