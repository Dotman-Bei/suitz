"use client";

import { useEffect, useState } from "react";
import { clsx } from "@/lib/cn";

export type DocsNavItem = { id: string; index: string; label: string };

/**
 * Scroll-spied table of contents. Sticky rail on desktop; a wrapping chip row
 * on smaller screens. Highlights whichever section currently owns the viewport.
 */
export function DocsNav({ items }: { items: DocsNavItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the top-most section currently intersecting the spy band.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A narrow band a quarter down the viewport decides ownership.
      { rootMargin: "-20% 0px -70% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Documentation sections">
      {/* mobile: wrapping chips */}
      <ul className="flex flex-wrap gap-2 lg:hidden">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 font-mono text-2xs uppercase tracking-[0.08em] transition",
                active === item.id
                  ? "border-ink-900 bg-ink-900 text-paper"
                  : "border-line-strong bg-paper text-ink-600 hover:border-ink-900",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      {/* desktop: vertical rail */}
      <ul className="hidden space-y-1 border-l border-line lg:block">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={clsx(
                "-ml-px flex items-baseline gap-2.5 border-l py-1.5 pl-4 text-sm transition-colors",
                active === item.id
                  ? "border-ink-900 font-medium text-ink-900"
                  : "border-transparent text-ink-500 hover:text-ink-900",
              )}
            >
              <span className="font-mono text-2xs tabular-nums text-ink-300">{item.index}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
