"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { RevealState } from "@/lib/types";

export type Tab = "registry" | "wrap" | "decrypt" | "faucet";

/**
 * A confidential (ERC-7984) balance as the UI tracks it across tabs.
 *
 * There is deliberately no ciphertext handle here: the real euint64 handle is
 * read fresh from `confidentialBalanceOf` at decrypt time (see DecryptView /
 * WrapView). This store only caches the *result* of a decryption plus an
 * optimistic post-wrap amount, shared so the Unwrap tab's MAX and balance
 * checks stay in sync with what the Decrypt tab revealed. The true cleartext
 * `amount` stays hidden — components only ever render `state` / `revealed`.
 */
interface ConfEntry {
  amount: number;
  state: RevealState;
  revealed?: string;
}

interface Store {
  // navigation
  tab: Tab;
  setTab: (t: Tab) => void;
  selectedPairId: string | null;
  decryptTarget: string | null;
  setDecryptTarget: (a: string | null) => void;
  selectPair: (pairId: string) => void;
  goWrap: (pairId: string) => void;
  goDecrypt: (address: string) => void;

  // confidential (ERC-7984) balances, keyed by confidential symbol
  conf: Record<string, ConfEntry>;
  addConf: (confSymbol: string, amount: number) => void;
  subConf: (confSymbol: string, amount: number) => void;
  setConfReveal: (confSymbol: string, state: RevealState, revealed?: string) => void;
}

const AppStoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("registry");
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [decryptTarget, setDecryptTarget] = useState<string | null>(null);
  const [conf, setConf] = useState<Record<string, ConfEntry>>({});

  // Change the active pair without navigating — used when already on the Wrap
  // tab, so it doesn't trigger the router.push scroll-to-top that goWrap does.
  const selectPair = useCallback((pairId: string) => setSelectedPairId(pairId), []);

  const goWrap = useCallback(
    (pairId: string) => {
      setSelectedPairId(pairId);
      setTab("wrap");
      router.push("/console");
    },
    [router],
  );

  const goDecrypt = useCallback(
    (address: string) => {
      setDecryptTarget(address);
      setTab("decrypt");
      router.push("/console");
    },
    [router],
  );

  // A fresh deposit re-encrypts the balance, so it must be decrypted again
  // before its cleartext is trusted — reset to `encrypted` on every mutation.
  const addConf = useCallback((confSymbol: string, amount: number) => {
    setConf((c) => {
      const total = (c[confSymbol]?.amount ?? 0) + amount;
      return { ...c, [confSymbol]: { amount: total, state: "encrypted" } };
    });
  }, []);
  const subConf = useCallback((confSymbol: string, amount: number) => {
    setConf((c) => {
      const prev = c[confSymbol];
      if (!prev) return c;
      const total = Math.max(0, prev.amount - amount);
      return { ...c, [confSymbol]: { amount: total, state: "encrypted" } };
    });
  }, []);
  const setConfReveal = useCallback(
    (confSymbol: string, state: RevealState, revealed?: string) => {
      setConf((c) => {
        const prev = c[confSymbol];
        // Upsert: a balance may have been wrapped in a previous session (so no
        // local entry exists yet) and only just decrypted on the Decrypt tab.
        // Without this, the reveal can't propagate back to Wrap/Unwrap.
        const amount =
          state === "revealed" && revealed !== undefined ? Number(revealed) : prev?.amount ?? 0;
        return { ...c, [confSymbol]: { amount, state, revealed } };
      });
    },
    [],
  );

  const value = useMemo<Store>(
    () => ({
      tab,
      setTab,
      selectedPairId,
      decryptTarget,
      setDecryptTarget,
      selectPair,
      goWrap,
      goDecrypt,
      conf,
      addConf,
      subConf,
      setConfReveal,
    }),
    [tab, selectedPairId, decryptTarget, conf, selectPair, goWrap, goDecrypt, addConf, subConf, setConfReveal],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useStore must be used within <AppStoreProvider>");
  return ctx;
}
