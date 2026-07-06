"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { probeConfidentialToken, type PairProbe } from "@/lib/registry";
import { REPO_URL } from "@/lib/network";
import type { WrapperPair } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { TokenGlyph } from "@/components/ui/TokenGlyph";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { AddressTag } from "@/components/ui/AddressTag";
import { Close, Spinner, Plus, Copy, Check, ExternalLink } from "@/components/ui/Icons";

/**
 * A ready-to-paste `LOCAL_PAIRS` entry for config/pairs.ts — drop it straight
 * inside the array (2-space indented to match the file's existing entries).
 */
function configSnippet(confidential: string, note: string): string {
  const noteLine = note.trim() ? `\n    note: ${JSON.stringify(note.trim())},` : "";
  return `  {\n    confidential: "${confidential}",${noteLine}\n  },`;
}

function githubIssueUrl(pair: WrapperPair, snippet: string): string {
  const title = `Add pair: ${pair.confidential.symbol}`;
  const body = [
    `Add this ERC-20 ↔ ERC-7984 pair to \`config/pairs.ts\` (inside \`LOCAL_PAIRS\`):`,
    ``,
    "```ts",
    snippet,
    "```",
    ``,
    `- Underlying: ${pair.underlying.symbol} (${pair.underlying.address})`,
    `- Confidential: ${pair.confidential.symbol} (${pair.confidential.address})`,
  ].join("\n");
  return `${REPO_URL.replace(/\/$/, "")}/issues/new?title=${encodeURIComponent(
    title,
  )}&body=${encodeURIComponent(body)}`;
}

export function AddPairModal({
  open,
  onClose,
  onAdd,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  /** Persist + surface the pair; parent refreshes the registry. */
  onAdd: (pair: WrapperPair) => void;
  existing: WrapperPair[];
}) {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState<PairProbe | null>(null);
  const [copied, setCopied] = useState(false);
  const reqId = useRef(0);

  useEffect(() => setMounted(true), []);

  // reset on close + escape-to-close
  useEffect(() => {
    if (!open) {
      setValue("");
      setNote("");
      setProbe(null);
      setProbing(false);
      setCopied(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // debounced onchain probe; ignore results from superseded inputs
  useEffect(() => {
    const v = value.trim();
    if (!v) {
      setProbe(null);
      setProbing(false);
      return;
    }
    const id = ++reqId.current;
    setProbing(true);
    const t = setTimeout(async () => {
      const res = await probeConfidentialToken(v);
      if (id === reqId.current) {
        setProbe(res);
        setProbing(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [value]);

  if (!mounted) return null;

  const pair = probe?.ok ? probe.pair : null;
  const collision =
    pair &&
    existing.find(
      (p) => p.confidential.address.toLowerCase() === pair.confidential.address.toLowerCase(),
    );
  const snippet = pair ? configSnippet(pair.confidential.address, note) : "";

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  function add() {
    if (!pair) return;
    onAdd({ ...pair, note: note.trim() || undefined });
    onClose();
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" onClick={onClose} aria-hidden />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Add a pair"
            className="glass relative w-full max-w-[520px] rounded-2xl p-6"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">Add a pair</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Paste an ERC-7984 wrapper address. The underlying ERC-20 and all metadata are
                  read onchain, no rebuild.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-sm text-ink-400 hover:bg-ink-100 hover:text-ink-900"
              >
                <Close width={16} height={16} />
              </button>
            </div>

            {/* address input */}
            <div className="mt-5">
              <label className="mono-label" htmlFor="add-pair-addr">
                Confidential (ERC-7984) address
              </label>
              <div className="input-shell mt-1.5">
                <input
                  id="add-pair-addr"
                  className="input font-mono text-sm"
                  placeholder="0x…"
                  autoComplete="off"
                  spellCheck={false}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                <span className="flex items-center pr-3 text-ink-300">
                  {probing && <Spinner width={15} height={15} />}
                </span>
              </div>
            </div>

            {/* result */}
            <div className="mt-4">
              {probe && !probe.ok && !probing && (
                <Alert tone="error" title="Can't add this address">
                  {probe.error}
                </Alert>
              )}

              {pair && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-line bg-paper-sunken/50 p-4">
                    <div className="flex items-center gap-3">
                      <TokenGlyph symbol={pair.confidential.symbol} confidential />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium leading-tight">{pair.confidential.symbol}</span>
                          <SourceBadge source="local" />
                        </div>
                        <div className="truncate text-xs text-ink-400">{pair.confidential.name}</div>
                      </div>
                      <div className="text-right font-mono text-xs text-ink-500">
                        {pair.confidential.decimals} dec
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="mono-label text-ink-400">Underlying · {pair.underlying.symbol}</span>
                        <AddressTag address={pair.underlying.address} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="mono-label text-ink-400">Confidential</span>
                        <AddressTag address={pair.confidential.address} />
                      </div>
                    </div>
                  </div>

                  {collision ? (
                    <Alert tone="info" title={`Already in the registry (${collision.source})`}>
                      On address collision the onchain record always wins; a local entry for this
                      wrapper won&apos;t override it.
                    </Alert>
                  ) : (
                    <>
                      <div>
                        <label className="mono-label" htmlFor="add-pair-note">
                          Note (optional)
                        </label>
                        <input
                          id="add-pair-note"
                          className="input mt-1.5 text-sm"
                          placeholder="e.g. my hackathon token"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="mono-label">config/pairs.ts entry</span>
                        <pre className="mt-1.5 overflow-x-auto rounded-sm border border-line bg-paper-sunken p-3 font-mono text-2xs leading-relaxed text-ink-700">{snippet}</pre>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* actions */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button onClick={add} disabled={!pair || !!collision}>
                <Plus width={15} height={15} />
                Add to registry
              </Button>
              <Button variant="outline" onClick={copySnippet} disabled={!pair}>
                {copied ? <Check width={15} height={15} /> : <Copy width={15} height={15} />}
                {copied ? "Copied" : "Copy config"}
              </Button>
              {pair && REPO_URL && (
                <a
                  href={githubIssueUrl(pair, snippet)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm ml-auto"
                >
                  Suggest on GitHub
                  <ExternalLink width={14} height={14} />
                </a>
              )}
            </div>

            <p className="mt-4 text-2xs text-ink-400">
              Added pairs are stored in your browser (this session). Use <span className="font-mono">Copy config</span> to
              make it permanent via <span className="font-mono">config/pairs.ts</span>, or register it onchain to have it
              surface as official everywhere.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
