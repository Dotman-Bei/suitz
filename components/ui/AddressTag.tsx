"use client";

import { useState } from "react";
import { clsx } from "@/lib/cn";
import { shortAddress, blockExplorer } from "@/lib/format";
import { Copy, Check, ExternalLink } from "./Icons";

/**
 * Monospace address chip with copy + explorer affordances. Crypto data is
 * always mono here — a deliberate "this is real onchain state" signal.
 */
export function AddressTag({
  address,
  label,
  className,
}: {
  address: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <span className={clsx("group inline-flex items-center gap-1.5", className)}>
      {label && <span className="mono-label normal-case tracking-normal text-ink-400">{label}</span>}
      <code className="font-mono text-xs text-ink-700">{shortAddress(address)}</code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy address"
        className="text-ink-300 opacity-0 transition group-hover:opacity-100 hover:text-ink-900"
      >
        {copied ? <Check width={13} height={13} /> : <Copy width={13} height={13} />}
      </button>
      <a
        href={blockExplorer(address)}
        target="_blank"
        rel="noreferrer"
        aria-label="View on Etherscan"
        className="text-ink-300 opacity-0 transition group-hover:opacity-100 hover:text-ink-900"
      >
        <ExternalLink width={13} height={13} />
      </a>
    </span>
  );
}
