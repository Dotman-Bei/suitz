import { clsx } from "@/lib/cn";

type Tone = "ink" | "paper";

/**
 * suitz wordmark. A plain, confident lockup — "suitz." — in the display face.
 * Colour follows the surface; the trailing dot is the only flourish.
 */
export function Logo({ tone = "ink", className }: { tone?: Tone; className?: string }) {
  return (
    <span
      className={clsx("logo-word", tone === "ink" ? "text-ink-900" : "text-paper", className)}
      role="img"
      aria-label="suitz"
    >
      <span aria-hidden>
        suitz<span className="logo-dot">.</span>
      </span>
    </span>
  );
}

/** Square monogram — for favicons, avatars, empty states. */
export function LogoMark({ tone = "ink", className }: { tone?: Tone; className?: string }) {
  return (
    <span
      className={clsx(
        "logo-mark",
        tone === "ink" ? "bg-ink-900 text-paper" : "bg-paper text-ink-900",
        className,
      )}
      role="img"
      aria-label="suitz"
    >
      s
    </span>
  );
}
