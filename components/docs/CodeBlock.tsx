"use client";

import { useState } from "react";
import { Copy, Check } from "@/components/ui/Icons";

/**
 * Dark, copyable code panel for the docs page — the same treatment as the
 * landing page's Add-pair code card so code always reads as "terminal".
 */
export function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-ink-900">
      <div className="flex items-center justify-between gap-3 border-b border-ink-800 px-4 py-2.5">
        <span className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-400">
          {title ?? "code"}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[0.8rem] leading-relaxed text-ink-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard unavailable — no-op */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-2xs text-ink-400 transition hover:text-paper"
    >
      {copied ? <Check width={13} height={13} /> : <Copy width={13} height={13} />}
      {copied ? "copied" : "copy"}
    </button>
  );
}
