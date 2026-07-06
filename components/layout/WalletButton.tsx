"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { Button } from "@/components/ui/Button";
import { Wallet, ChevronDown, Copy, ExternalLink } from "@/components/ui/Icons";
import { shortAddress, blockExplorer } from "@/lib/format";

export function WalletButton() {
  const { connected, address, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!connected) {
    return (
      <>
        <Button onClick={() => setShowConnect(true)} size="md">
          <Wallet width={16} height={16} />
          Connect wallet
        </Button>
        <ConnectModal open={showConnect} onClose={() => setShowConnect(false)} />
      </>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-outline gap-2"
      >
        <span className="h-4 w-4 rounded-full bg-gradient-to-br from-ink-900 to-ink-500" />
        <span className="font-mono text-xs">{shortAddress(address ?? "")}</span>
        <ChevronDown width={14} height={14} className="text-ink-400" />
      </button>

      {open && (
        <div className="glass absolute right-0 z-50 mt-2 w-60 animate-fade-up rounded-md p-1.5">
          <div className="px-3 py-2.5">
            <div className="mono-label">Connected</div>
            <div className="mt-1 font-mono text-xs text-ink-700">{shortAddress(address ?? "", 10, 8)}</div>
          </div>
          <div className="rule my-1" />
          <button
            type="button"
            onClick={() => address && navigator.clipboard.writeText(address)}
            className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-ink-700 hover:bg-ink-100"
          >
            <Copy width={15} height={15} /> Copy address
          </button>
          <a
            href={address ? blockExplorer(address) : "#"}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-ink-700 hover:bg-ink-100"
          >
            <ExternalLink width={15} height={15} /> View on Etherscan
          </a>
          <div className="rule my-1" />
          <button
            type="button"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-signal-error hover:bg-signal-errorbg"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
