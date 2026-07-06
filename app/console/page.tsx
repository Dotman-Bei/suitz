import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { Console } from "@/components/sections/Console";
import { ArrowRight } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Console",
  description:
    "Browse the onchain registry, claim test tokens, wrap, decrypt and unwrap ERC-20 ↔ ERC-7984 pairs on Sepolia. Every operation happens here.",
};

export default function ConsolePage() {
  return (
    <section className="shell scroll-mt-24 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-400 transition hover:text-ink-900"
        >
          <ArrowRight width={13} height={13} className="rotate-180 transition group-hover:-translate-x-0.5" />
          suitz home
        </Link>

        <p className="eyebrow mt-7">Console</p>
        <ScrambleText
          as="h1"
          text="Wrap, decrypt & unwrap."
          className="mt-4 block max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl"
        />
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
          Every operation happens here. Browse the registry, claim the official
          cTokenMocks, wrap an ERC-20 into its confidential form, decrypt your
          balance, and unwrap back.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-10">
        <Console />
      </Reveal>
    </section>
  );
}
