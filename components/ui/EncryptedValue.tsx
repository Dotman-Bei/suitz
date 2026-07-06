"use client";

import { clsx } from "@/lib/cn";
import type { ConfidentialBalance } from "@/lib/types";
import { groupNumber } from "@/lib/format";
import { Lock, Key, Spinner } from "./Icons";

type Size = "sm" | "md" | "lg";

const sizeText: Record<Size, string> = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-4xl",
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
}: {
  balance: ConfidentialBalance;
  symbol?: string;
  size?: Size;
  onDecrypt?: () => void;
  decryptLabel?: string;
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
          awaiting signature · re-encrypting via relayer…
        </span>
      ) : state === "error" ? (
        <span className="mono-label normal-case tracking-normal text-signal-error">
          decryption failed — retry
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
