"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRegistry } from "@/lib/registry";
import type { WrapperPair, PairSource } from "@/lib/types";
import { useStore } from "@/components/providers/AppStore";
import { TokenGlyph } from "@/components/ui/TokenGlyph";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { AddressTag } from "@/components/ui/AddressTag";
import { Button } from "@/components/ui/Button";
import { Search, ArrowRight, Key } from "@/components/ui/Icons";

type Filter = "all" | PairSource;

export function RegistryView() {
  const { goWrap, goDecrypt } = useStore();
  const [pairs, setPairs] = useState<WrapperPair[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let alive = true;
    fetchRegistry().then((p) => alive && setPairs(p));
    return () => {
      alive = false;
    };
  }, []);

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

        <Segmented value={filter} onChange={setFilter} />
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
        <code className="font-mono">config/pairs.ts</code> — see the Decrypt tab to read any balance,
        or add your own pair (README → “Adding a pair”).
      </p>
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
