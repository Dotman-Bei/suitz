"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useConnect, useConnectors, type Connector } from "wagmi";
import { Close, Wallet, Spinner, ArrowRight } from "@/components/ui/Icons";

export function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const connectors = useConnectors();
  const { connectAsync } = useConnect();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // EIP-6963 discovered wallets carry a unique id + icon; the generic
  // "injected" connector is the fallback when nothing was discovered.
  const wallets = useMemo(() => {
    const discovered = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
    const generic = connectors.find((c) => c.id === "injected");
    const list = discovered.length ? discovered : generic ? [generic] : [];
    const seen = new Set<string>();
    return list.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  }, [connectors]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setPendingId(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function pick(connector: Connector) {
    setError(null);
    setPendingId(connector.id);
    try {
      await connectAsync({ connector });
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed.";
      setError(/reject|denied|user/i.test(msg) ? "Connection request rejected." : msg);
    } finally {
      setPendingId(null);
    }
  }

  if (!mounted) return null;

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
          {/* scrim */}
          <div
            className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* glass panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Connect a wallet"
            className="glass relative w-full max-w-[400px] rounded-2xl p-6"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">Connect a wallet</h2>
                <p className="mt-1 text-sm text-ink-500">Choose a detected wallet to continue on Sepolia.</p>
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

            <div className="mt-5 space-y-2">
              {wallets.length === 0 && (
                <div className="rounded-md border border-line bg-paper-sunken/60 p-5 text-center">
                  <p className="text-sm font-medium">No wallet detected</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Install a browser wallet to continue.
                  </p>
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-900 underline-offset-4 hover:underline"
                  >
                    Get MetaMask <ArrowRight width={14} height={14} />
                  </a>
                </div>
              )}

              {wallets.map((c) => {
                const isPending = pendingId === c.id;
                const busy = pendingId !== null;
                return (
                  <button
                    key={c.uid}
                    type="button"
                    disabled={busy}
                    onClick={() => pick(c)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-white/50 bg-white/40 px-4 py-3.5 text-left transition hover:border-ink-900/20 hover:bg-white/70 disabled:opacity-50"
                  >
                    <WalletIcon connector={c} />
                    <span className="flex-1 font-medium">{c.name === "Injected" ? "Browser Wallet" : c.name}</span>
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
                        <Spinner width={14} height={14} /> connecting
                      </span>
                    ) : (
                      <ArrowRight
                        width={16}
                        height={16}
                        className="text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-900"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="mt-4 rounded-sm border border-signal-error/25 bg-signal-errorbg px-3 py-2 text-sm text-signal-error">
                {error}
              </p>
            )}

            <p className="mt-5 text-center text-2xs text-ink-400">
              suitz is non-custodial. We never see your keys or balances.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function WalletIcon({ connector }: { connector: Connector }) {
  const icon = (connector as { icon?: string }).icon;
  if (icon) {
    return (
      // Connector-provided icon (data-URI / remote URL); next/image can't
      // optimise arbitrary wallet URLs and adds no value for a 36px glyph.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt=""
        className="h-9 w-9 rounded-lg border border-white/60 bg-white object-contain p-0.5"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-paper text-ink-600">
      <Wallet width={18} height={18} />
    </span>
  );
}
