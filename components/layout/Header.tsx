"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { WalletButton } from "./WalletButton";
import { clsx } from "@/lib/cn";

const NAV = [
  { label: "Console", href: "/console" },
  { label: "How it works", href: "/#how" },
  { label: "Why suitz", href: "/#why" },
  { label: "Docs", href: "/docs" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40">
      <div className={clsx("shell transition-all duration-300", scrolled ? "pt-2" : "pt-4")}>
        <div
          className={clsx(
            "glass relative flex items-center justify-between gap-4 rounded-2xl px-4 transition-all duration-300 sm:px-6",
            scrolled ? "h-14 ring-1 ring-ink-900/5" : "h-[64px]",
          )}
        >
          {/* animated glass sheen — clipped to the bar so it never clips popovers */}
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <span className="absolute inset-y-0 left-0 w-1/4 animate-sheen bg-gradient-to-r from-transparent via-white/85 to-transparent blur-[2px] motion-reduce:hidden" />
          </span>

          <Link href="/" className="relative rounded-sm outline-offset-4" aria-label="suitz home">
            <Logo className={clsx("transition-all", scrolled ? "text-[1.4rem]" : "text-[1.55rem]")} />
          </Link>

          <nav className="relative hidden items-center gap-8 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="relative text-sm text-ink-600 transition-colors hover:text-ink-900 after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-ink-900 after:transition-all after:duration-300 hover:after:w-full"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="relative">
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}
