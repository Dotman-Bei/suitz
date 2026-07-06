import type { WrapperPair } from "@/lib/types";

/**
 * LOCAL OVERRIDE LAYER (the documented "add a pair" path A).
 *
 * suitz reads the official onchain WrappersRegistry as the source of truth.
 * Anything you declare here is *merged on top* for custom or dev-only pairs
 * that aren't registered onchain yet. Local entries are badged `local` in the
 * UI and never masquerade as official. If a pair later appears onchain, the
 * onchain record wins and the badge flips to `official` automatically
 * (see lib/registry.ts → resolvePairs).
 *
 * To add a dev pair: copy a block below, drop in your two addresses, save.
 * It appears in the Registry tab immediately — wrap / unwrap / decrypt all work.
 */
export const SEPOLIA_CHAIN_ID = 11155111;

export const LOCAL_PAIRS: WrapperPair[] = [
  {
    id: "cfoo",
    source: "local",
    chainId: SEPOLIA_CHAIN_ID,
    underlying: {
      address: "0x9F0e8aA11B2C3d4E5f60718293a4b5C6d7E8F900",
      symbol: "FOO",
      name: "Foo Dev Token",
      decimals: 18,
    },
    confidential: {
      address: "0x1A2b3C4d5E6f70819aB2c3D4e5F60718293A4b5C",
      symbol: "cFOO",
      name: "Confidential Foo",
      decimals: 18,
    },
  },
];
