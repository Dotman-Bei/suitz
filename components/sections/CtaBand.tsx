"use client";

import { useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { ArrowRight } from "@/components/ui/Icons";

export function CtaBand() {
  const router = useRouter();
  const reduce = useReducedMotion();

  return (
    <section className="on-dark relative overflow-hidden bg-ink-900 py-28 text-paper">
      <div className={`pointer-events-none absolute inset-0 bg-grid-dark ${reduce ? "" : "animate-grid-pan"} opacity-60`} />
      <div className="pointer-events-none absolute -left-10 top-1/2 -translate-y-1/2 select-none font-display text-[28rem] font-bold leading-none hollow opacity-[0.06]">
        z
      </div>

      <div className="shell relative">
        <Reveal>
          <div className="glass-dark rounded-3xl p-8 sm:p-14">
          <h2 className="max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Stop shipping look-alikes.
            <br />
            Use the <span className="hollow-thin">canonical</span> wrappers.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-300">
            One registry. Every official ERC-20 ↔ ERC-7984 pair. Wrap, decrypt and
            unwrap on Sepolia in a console judges — and developers — can trust.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push("/console")}
              className="btn btn-lg bg-paper text-ink-900 hover:-translate-y-px hover:bg-ink-100"
            >
              Open the console <ArrowRight width={17} height={17} />
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="btn btn-lg border border-ink-700 text-paper hover:border-paper"
            >
              View on GitHub
            </a>
          </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
