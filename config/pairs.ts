import type { LocalPairInput } from "@/lib/types";

/**
 * LOCAL OVERRIDE LAYER (the documented "add a pair" path — config route).
 *
 * suitz reads the official onchain WrappersRegistry as the source of truth.
 * Anything you declare here is *merged on top* for custom or dev-only pairs
 * that aren't registered onchain yet. Local entries are badged `local` in the
 * UI and never masquerade as official. If a pair later appears onchain, the
 * onchain record wins and the badge flips to `official` automatically
 * (see lib/registry.ts → resolvePairs).
 *
 * You only need the confidential (ERC-7984) wrapper address. The underlying
 * ERC-20 and ALL metadata (symbol / name / decimals) are read onchain at
 * runtime — so a local pair can never carry wrong metadata. Add `underlying`
 * only if the wrapper doesn't expose `underlying()` and you must override it.
 *
 * To add a dev pair: uncomment the example, drop in your wrapper address, save.
 * It appears in the Registry tab immediately — wrap / unwrap / decrypt all work.
 * (For a zero-code alternative, use the "Add pair" button in the Registry tab.)
 */
export const SEPOLIA_CHAIN_ID = 11155111;

export const LOCAL_PAIRS: LocalPairInput[] = [
  // {
  //   confidential: "0xYourErc7984WrapperAddress",
  //   note: "my hackathon token",
  // },
];
