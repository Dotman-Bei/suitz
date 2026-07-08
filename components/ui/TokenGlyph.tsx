import Image from "next/image";
import { clsx } from "@/lib/cn";
import { tokenIcon } from "@/lib/tokenIcons";
import { Lock } from "@/components/ui/Icons";

/**
 * Avatar for a token. Known tokens render their real logo full-bleed — the
 * logo IS the avatar, no tile behind it — and the confidential side is marked
 * with a small ink lock badge instead of an inverted background. Unknown
 * tokens fall back to the original monogram tile (inverted when confidential).
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
  const icon = tokenIcon(symbol);

  if (icon) {
    const badge = Math.round(Math.max(11, size * 0.44));
    return (
      <span
        style={{ width: size, height: size }}
        className={clsx("relative inline-flex shrink-0 select-none", className)}
        aria-hidden
      >
        {/* unoptimized: tiny static assets straight from /public — no optimizer,
            which also keeps the SVGs working without dangerouslyAllowSVG. */}
        <Image
          src={icon}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="h-full w-full rounded-sm object-contain"
        />
        {confidential && (
          <span
            style={{ width: badge, height: badge }}
            className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-ink-900 text-paper ring-2 ring-paper"
          >
            <Lock width={Math.round(badge * 0.6)} height={Math.round(badge * 0.6)} />
          </span>
        )}
      </span>
    );
  }

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
