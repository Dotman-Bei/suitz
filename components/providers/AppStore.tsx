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
import type { ConfidentialBalance, RevealState } from "@/lib/types";
import { fakeCiphertext } from "@/lib/format";

export type Tab = "registry" | "wrap" | "decrypt" | "faucet";

/** Confidential entry keeps the true cleartext `amount` hidden from the UI;
 *  components only ever render `state` / `revealed`. */
interface ConfEntry extends ConfidentialBalance {
  amount: number;
}

interface Store {
  // navigation
  tab: Tab;
  setTab: (t: Tab) => void;
  selectedPairId: string | null;
  decryptTarget: string | null;
  setDecryptTarget: (a: string | null) => void;
  goWrap: (pairId: string) => void;
  goDecrypt: (address: string) => void;

  // ERC-20 (underlying) balances, keyed by underlying symbol
  erc20: Record<string, number>;
  addErc20: (symbol: string, amount: number) => void;
  subErc20: (symbol: string, amount: number) => void;

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
  const [erc20, setErc20] = useState<Record<string, number>>({});
  const [conf, setConf] = useState<Record<string, ConfEntry>>({});

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

  const addErc20 = useCallback((symbol: string, amount: number) => {
    setErc20((b) => ({ ...b, [symbol]: (b[symbol] ?? 0) + amount }));
  }, []);
  const subErc20 = useCallback((symbol: string, amount: number) => {
    setErc20((b) => ({ ...b, [symbol]: Math.max(0, (b[symbol] ?? 0) - amount) }));
  }, []);

  const addConf = useCallback((confSymbol: string, amount: number) => {
    setConf((c) => {
      const prev = c[confSymbol];
      const total = (prev?.amount ?? 0) + amount;
      return {
        ...c,
        [confSymbol]: {
          amount: total,
          handle: fakeCiphertext(`${confSymbol}:${total}`),
          state: "encrypted", // a new deposit re-encrypts; must decrypt again
        },
      };
    });
  }, []);
  const subConf = useCallback((confSymbol: string, amount: number) => {
    setConf((c) => {
      const prev = c[confSymbol];
      if (!prev) return c;
      const total = Math.max(0, prev.amount - amount);
      return {
        ...c,
        [confSymbol]: {
          amount: total,
          handle: fakeCiphertext(`${confSymbol}:${total}`),
          state: "encrypted",
        },
      };
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
          state === "revealed" && revealed !== undefined
            ? Number(revealed)
            : prev?.amount ?? 0;
        return {
          ...c,
          [confSymbol]: {
            amount,
            handle: prev?.handle ?? fakeCiphertext(confSymbol),
            state,
            revealed,
          },
        };
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
      goWrap,
      goDecrypt,
      erc20,
      addErc20,
      subErc20,
      conf,
      addConf,
      subConf,
      setConfReveal,
    }),
    [tab, selectedPairId, decryptTarget, erc20, conf, goWrap, goDecrypt, addErc20, subErc20, addConf, subConf, setConfReveal],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useStore must be used within <AppStoreProvider>");
  return ctx;
}
