import { describe, expect, it } from "vitest";
import { isAddress } from "viem";
import { OFFICIAL_PAIRS, resolvePairs } from "./registry";
import type { WrapperPair } from "./types";

/** A valid 40-hex-char address filled with a single nibble, for fixtures. */
const addr = (nibble: string) => `0x${nibble.repeat(40)}` as `0x${string}`;

function localPair(overrides: Partial<WrapperPair> = {}): WrapperPair {
  return {
    id: "cfoo",
    source: "local",
    chainId: 11155111,
    underlying: { address: addr("b"), symbol: "FOO", name: "Foo Mock", decimals: 18 },
    confidential: { address: addr("a"), symbol: "cFOO", name: "Confidential FOO", decimals: 6 },
    ...overrides,
  };
}

/**
 * Coverage baseline — the canonical cTokenMocks the app must always surface.
 * Even if the onchain read drops one (RPC drift), the verified seed carries it,
 * so this assertion guarantees a mock can never silently vanish from suitz.
 */
const EXPECTED_OFFICIAL = [
  "USDCMock",
  "USDTMock",
  "WETHMock",
  "BRONMock",
  "ZAMAMock",
  "tGBPMock",
  "XAUtMock",
];

describe("official cTokenMock coverage", () => {
  it("surfaces every expected official mock", () => {
    const symbols = new Set(OFFICIAL_PAIRS.map((p) => p.underlying.symbol));
    for (const sym of EXPECTED_OFFICIAL) expect(symbols).toContain(sym);
  });

  it("keeps every official pair well-formed", () => {
    for (const p of OFFICIAL_PAIRS) {
      expect(p.source).toBe("official");
      expect(isAddress(p.underlying.address)).toBe(true);
      expect(isAddress(p.confidential.address)).toBe(true);
      expect(p.underlying.address.toLowerCase()).not.toBe(p.confidential.address.toLowerCase());
      // confidential wrappers cap decimals so amounts stay uint64-safe
      expect(p.confidential.decimals).toBeGreaterThan(0);
      expect(p.confidential.decimals).toBeLessThanOrEqual(9);
    }
  });

  it("assigns a unique id to every pair", () => {
    const ids = OFFICIAL_PAIRS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolvePairs — hybrid merge", () => {
  it("defaults to the verified official seed with no arguments", () => {
    expect(resolvePairs()).toHaveLength(OFFICIAL_PAIRS.length);
  });

  it("merges a non-colliding local pair on top of onchain", () => {
    const merged = resolvePairs(OFFICIAL_PAIRS, [localPair()]);
    expect(merged).toHaveLength(OFFICIAL_PAIRS.length + 1);
    expect(merged.find((p) => p.confidential.address === addr("a"))?.source).toBe("local");
  });

  it("lets the onchain (official) record win on a confidential-address collision", () => {
    const official0 = OFFICIAL_PAIRS[0];
    const collider = localPair({
      confidential: { ...official0.confidential, symbol: "cFAKE", name: "Impostor" },
    });
    const merged = resolvePairs(OFFICIAL_PAIRS, [collider]);

    expect(merged).toHaveLength(OFFICIAL_PAIRS.length); // collider absorbed, not appended
    const winner = merged.find(
      (p) => p.confidential.address.toLowerCase() === official0.confidential.address.toLowerCase(),
    );
    expect(winner?.source).toBe("official");
    expect(winner?.confidential.symbol).toBe(official0.confidential.symbol);
  });

  it("orders official pairs before local ones", () => {
    const merged = resolvePairs(OFFICIAL_PAIRS, [localPair()]);
    const firstLocal = merged.findIndex((p) => p.source === "local");
    const lastOfficial = merged.map((p) => p.source).lastIndexOf("official");
    expect(firstLocal).toBeGreaterThan(-1);
    expect(lastOfficial).toBeLessThan(firstLocal);
  });
});
