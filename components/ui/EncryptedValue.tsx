"use client";

import { clsx } from "@/lib/cn";
import type { ConfidentialBalance } from "@/lib/types";
import type { DecryptPhase } from "@/lib/fheDecrypt";
import { groupNumber } from "@/lib/format";
import { Lock, Key, Spinner } from "./Icons";

type Size = "sm" | "md" | "lg";

const sizeText: Record<Size, string> = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-4xl",
};

/**
 * Narration for the decrypting lifecycle. The two middle phases are the point:
 * "awaiting-signature" only shows when a fresh EIP-712 permit is actually being
 * signed, while "reusing" tells the user the saved session permit is doing the
 * work with no wallet prompt at all.
 */
const DECRYPT_CAPTION: Record<DecryptPhase, string> = {
  checking: "checking for a session key…",
  "awaiting-signature": "awaiting signature · approve in your wallet",
  reusing: "session key found · decrypting, no new signature",
  relaying: "signature captured · re-encrypting via relayer…",
};

/**
 * The product's signature element. An ERC-7984 balance is an opaque handle
 * until the wallet authorises a user-decryption (EIP-712). This component makes
 * that lifecycle legible: blurred ciphertext → signing → a value that visibly
 * resolves out of the blur.
 */
export function EncryptedValue({
  balance,
  symbol,
  size = "md",
  onDecrypt,
  decryptLabel = "Decrypt",
  phase,
}: {
  balance: ConfidentialBalance;
  symbol?: string;
  size?: Size;
  onDecrypt?: () => void;
  decryptLabel?: string;
  /** Sub-phase shown while `state === "decrypting"`; defaults to the first phase. */
  phase?: DecryptPhase;
}) {
  const { state, handle, revealed } = balance;

  if (state === "revealed") {
    return (
      <div className="flex flex-col gap-1">
        <div className={clsx("revealed font-display font-semibold tracking-tight", sizeText[size])}>
          {groupNumber(revealed ?? "0")}
          {symbol && <span className="ml-2 text-ink-400">{symbol}</span>}
        </div>
        <code className="font-mono text-2xs text-ink-300">handle {handle}</code>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            sizeText[size],
            "font-display font-semibold tracking-tight",
            state === "decrypting" ? "ciphertext animate-pulse" : "ciphertext-strong",
          )}
        >
          {"████ ██"}
        </span>
        {state === "decrypting" ? (
          <Spinner className="text-ink-400" />
        ) : (
          <Lock className="text-ink-300" width={16} height={16} />
        )}
      </div>

      {state === "decrypting" ? (
        <span className="mono-label normal-case tracking-normal text-ink-500">
          {DECRYPT_CAPTION[phase ?? "checking"]}
        </span>
      ) : state === "error" ? (
        <span className="mono-label normal-case tracking-normal text-signal-error">
          decryption failed, retry
        </span>
      ) : (
        <code className="font-mono text-2xs text-ink-300">handle {handle}</code>
      )}

      {onDecrypt && state !== "decrypting" && (
        <button
          type="button"
          onClick={onDecrypt}
          className="mt-1 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-900 underline-offset-4 hover:underline"
        >
          <Key width={15} height={15} />
          {decryptLabel}
        </button>
      )}
    </div>
  );
}
