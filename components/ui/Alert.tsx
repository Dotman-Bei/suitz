import { clsx } from "@/lib/cn";
import { Alert as AlertIcon } from "./Icons";
import type { ReactNode } from "react";

/**
 * Errors are the only place colour enters the system, and even then it's a
 * muted brick red. Every failure mode maps to a human sentence here — judges
 * should never see a raw revert string (ROADMAP §5).
 */
export function Alert({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: "info" | "error";
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={clsx("alert", tone === "error" ? "alert-error" : "alert-info")}>
      <AlertIcon
        width={16}
        height={16}
        className={clsx("mt-0.5 shrink-0", tone === "error" ? "text-signal-error" : "text-ink-400")}
      />
      <div className="flex-1">
        {title && <div className="font-medium leading-tight">{title}</div>}
        {children && <div className={clsx("text-sm", title && "mt-0.5", tone === "info" && "text-ink-600")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
