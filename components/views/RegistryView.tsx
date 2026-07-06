"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadSessionPairs, removeSessionPair, saveSessionPair } from "@/lib/registry";
import { usePairs, useRefreshPairs } from "@/lib/usePairs";
import type { WrapperPair, PairSource } from "@/lib/types";
import { useStore } from "@/components/providers/AppStore";
import { TokenGlyph } from "@/components/ui/TokenGlyph";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { AddressTag } from "@/components/ui/AddressTag";
import { Button } from "@/components/ui/Button";
import { Search, ArrowRight, Key, Plus, Close } from "@/components/ui/Icons";
import { AddPairModal } from "./AddPairModal";

type Filter = "all" | PairSource;

export function RegistryView() {
  const { goWrap, goDecrypt } = useStore();
  // one shared, cached read of the live registry — the same source every tab
  // uses, so a pair added here is instantly usable in Wrap/Decrypt/Faucet.
  const { data: pairs } = usePairs();
  const refreshPairs = useRefreshPairs();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [addOpen, setAddOpen] = useState(false);
  // confidential addresses added live this session (removable from the UI)
  const [sessionAddrs, setSessionAddrs] = useState<Set<string>>(() => new Set());

  // keep the "removable session pair" set in sync whenever the list refreshes
  useEffect(() => {
    setSessionAddrs(new Set(loadSessionPairs().map((s) => s.confidential.toLowerCase())));
  }, [pairs]);

  const onAdd = useCallback(
    (pair: WrapperPair) => {
      saveSessionPair({ confidential: pair.confidential.address, note: pair.note });
      void refreshPairs();
    },
    [refreshPairs],
  );

  const onRemove = useCallback(
    (address: string) => {
      removeSessionPair(address);
      void refreshPairs();
    },
    [refreshPairs],
  );

  const filtered = useMemo(() => {
    if (!pairs) return [];
    const q = query.trim().toLowerCase();
    return pairs.filter((p) => {
      if (filter !== "all" && p.source !== filter) return false;
      if (!q) return true;
      return (
        p.confidential.symbol.toLowerCase().includes(q) ||
        p.underlying.symbol.toLowerCase().includes(q) ||
        p.confidential.name.toLowerCase().includes(q) ||
        p.underlying.address.toLowerCase().includes(q) ||
        p.confidential.address.toLowerCase().includes(q)
      );
    });
  }, [pairs, query, filter]);

  return (
    <div className="p-5 sm:p-8">
      <header className="section-head">
        <span className="section-index">01</span>
        <h2 className="text-xl font-semibold tracking-tight">Registry</h2>
        <span className="ml-auto mono-label">
          {pairs ? `${filtered.length} / ${pairs.length} pairs` : "loading…"}
        </span>
      </header>

      {/* toolbar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="input-shell max-w-sm">
          <span className="flex items-center pl-3 text-ink-300">
            <Search width={16} height={16} />
          </span>
          <input
            className="input"
            placeholder="Search symbol, name or address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Segmented value={filter} onChange={setFilter} />
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus width={15} height={15} />
            Add pair
          </Button>
        </div>
      </div>

      {/* table */}
      <div className="mt-6 overflow-hidden rounded-md border border-line">
        <div className="overflow-x-auto">
          <table className="reg-table min-w-[860px]">
            <thead>
              <tr>
                <th>Confidential token</th>
                <th>Underlying ERC-20</th>
                <th>Confidential ERC-7984</th>
                <th className="text-right">Decimals</th>
                <th>Source</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!pairs && <SkeletonRows />}
              {pairs &&
                filtered.map((p) => (
                  <tr key={p.id} className="reg-row group">
                    <td>
                      <div className="flex items-center gap-3">
                        <TokenGlyph symbol={p.confidential.symbol} confidential />
                        <div>
                          <div className="font-medium leading-tight">{p.confidential.symbol}</div>
                          <div className="text-xs text-ink-400">{p.confidential.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs text-ink-700">{p.underlying.symbol}</span>
                        <AddressTag address={p.underlying.address} />
                      </div>
                    </td>
                    <td>
                      <AddressTag address={p.confidential.address} />
                    </td>
                    <td className="text-right font-mono text-sm tabular text-ink-600">
                      {p.confidential.decimals}
                    </td>
                    <td>
                      <SourceBadge source={p.source} />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {sessionAddrs.has(p.confidential.address.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => onRemove(p.confidential.address)}
                            aria-label={`Remove ${p.confidential.symbol}`}
                            title="Remove this session-added pair"
                            className="flex h-7 w-7 items-center justify-center rounded-sm text-ink-300 transition hover:bg-ink-100 hover:text-ink-900"
                          >
                            <Close width={14} height={14} />
                          </button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => goDecrypt(p.confidential.address)}>
                          <Key width={14} height={14} />
                          Decrypt
                        </Button>
                        <Button size="sm" onClick={() => goWrap(p.id)}>
                          Wrap
                          <ArrowRight width={14} height={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {pairs && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="font-medium">No pairs match “{query}”.</p>
            <p className="text-sm text-ink-500">
              Try a different symbol, or add a dev pair in{" "}
              <code className="font-mono text-ink-700">config/pairs.ts</code>.
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-ink-400">
        Official pairs are read from the onchain WrappersRegistry. Local pairs come from{" "}
        <code className="font-mono">config/pairs.ts</code> or the{" "}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="font-medium text-ink-700 underline-offset-2 hover:underline"
        >
          Add pair
        </button>{" "}
        button, both merge onto the onchain source of truth (README → “Adding a pair”).
      </p>

      <AddPairModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={onAdd}
        existing={pairs ?? []}
      />
    </div>
  );
}

function Segmented({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  const opts: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "official", label: "Official" },
    { id: "local", label: "Local" },
  ];
  return (
    <div className="inline-flex rounded-sm border border-line-strong bg-paper p-0.5">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={
            "rounded-[3px] px-3.5 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] transition " +
            (value === o.id ? "bg-ink-900 text-paper" : "text-ink-500 hover:text-ink-900")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j}>
              <div className="skeleton h-5" style={{ width: j === 0 ? 180 : j === 5 ? 150 : 110 }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
