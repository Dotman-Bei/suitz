import { clsx } from "@/lib/cn";

/**
 * Monogram avatar for a token. Monochrome by design — confidential tokens get
 * an inverted (ink) treatment so they read as the "encrypted" side of a pair.
 */
export function TokenGlyph({
  symbol,
  confidential = false,
  size = 36,
  className,
}: {
  symbol: string;
  confidential?: boolean;
  size?: number;
  className?: string;
}) {
  const initials = symbol.replace(/^c/, "").slice(0, 2).toUpperCase();
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-sm border font-mono font-medium tracking-tight",
        confidential
          ? "border-ink-900 bg-ink-900 text-paper"
          : "border-line-strong bg-paper text-ink-700",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
