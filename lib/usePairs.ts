"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRegistry } from "@/lib/registry";
import type { WrapperPair } from "@/lib/types";

/** Shared query key for the resolved registry (onchain + config + session). */
const PAIRS_KEY = ["pairs"] as const;

/**
 * Stable empty fallback for `usePairs().data` while the query loads. Use this
 * instead of a literal `[]` default: a fresh `[]` every render is a new
 * reference, which loops any effect/memo that lists `pairs` as a dependency.
 */
export const EMPTY_PAIRS: WrapperPair[] = [];

/**
 * The single source of pairs for the whole console.
 *
 * Every tab reads the same live registry — the onchain source of truth merged
 * with `config/pairs.ts` and the session-local "Add pair" entries — through one
 * cached react-query. So a pair added anywhere (registry read, config, or the
 * Add-pair modal) is immediately wrap/unwrap/decrypt-able *everywhere*, not just
 * in the Registry tab. This replaces the old per-view `resolvePairs()` reads,
 * which saw only the static seed and never the local/session pairs.
 */
export function usePairs() {
  return useQuery<WrapperPair[]>({
    queryKey: PAIRS_KEY,
    queryFn: fetchRegistry,
    staleTime: 60_000,
  });
}

/** Invalidate the shared pairs query — call after adding/removing a local pair. */
export function useRefreshPairs() {
  const qc = useQueryClient();
  return useCallback(() => qc.invalidateQueries({ queryKey: PAIRS_KEY }), [qc]);
}
