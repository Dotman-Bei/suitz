import { clsx } from "@/lib/cn";
import type { PairSource } from "@/lib/types";

/**
 * Official = solid ink chip (canonical, onchain). Local = outlined (dev pair
 * from config). The contrast is intentional: official should feel weightier.
 */
export function SourceBadge({ source }: { source: PairSource }) {
  return (
    <span className={clsx("badge", source === "official" ? "badge-official" : "badge-local")}>
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          source === "official" ? "bg-paper" : "bg-ink-400",
        )}
      />
      {source}
    </span>
  );
}
