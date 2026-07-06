"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TokenGlyph } from "@/components/ui/TokenGlyph";
import { ArrowRight, Lock, Check } from "@/components/ui/Icons";
import { SectionDoodles } from "@/components/decor/Doodles";

const easeOut = [0.2, 0.7, 0.2, 1] as const;

export function Hero() {
  const router = useRouter();

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="relative overflow-hidden border-b border-line">
      <HeroBackdrop />
      <SectionDoodles variant="hero" />

      <div className="shell relative grid min-h-[88vh] items-center gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ---- copy ---- */}
        <div>
          <h1 className="font-display text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, delay: 0.05, ease: easeOut }}
            >
              Clear in.
            </motion.span>
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, delay: 0.18, ease: easeOut }}
            >
              <span className="hollow">Confidential</span> out.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32, ease: easeOut }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-ink-600"
          >
            suitz is the canonical registry for Zama&apos;s ERC-20 ↔ ERC-7984
            wrappers. Faucet test tokens, wrap them into confidential balances,
            decrypt what&apos;s yours, and unwrap back, all from the official
            onchain registry, so the ecosystem stops fragmenting.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.44, ease: easeOut }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Button size="lg" onClick={() => router.push("/console")}>
              Open the console <ArrowRight width={17} height={17} />
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollTo("how")}>
              How it works
            </Button>
          </motion.div>

        </div>

        {/* ---- visual ---- */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.25, ease: easeOut }}
        >
          <TransformCard />
        </motion.div>
      </div>

      <ScrollCue />
    </section>
  );
}

/* ------------------------- animated background ---------------------------- */

function HeroBackdrop() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 bg-grid ${reduce ? "" : "animate-grid-pan"} opacity-60`} />
      <div className="absolute inset-0 bg-gradient-to-b from-paper/40 via-paper/70 to-paper" />
      {/* giant hollow z watermark */}
      <div className="absolute -right-10 top-1/2 -translate-y-1/2 select-none font-display text-[34rem] font-bold leading-none hollow opacity-[0.04]">
        z
      </div>
      {!reduce && <DriftingCipher />}
    </div>
  );
}

function DriftingCipher() {
  const cols = [
    { left: "12%", delay: "0s", dur: "9s", text: "0x9f3a…e1" },
    { left: "33%", delay: "1.4s", dur: "11s", text: "euint64" },
    { left: "68%", delay: "0.6s", dur: "8s", text: "0xc0de…02" },
    { left: "84%", delay: "2s", dur: "12s", text: "▓░▒ 0x4b" },
  ];
  return (
    <>
      {cols.map((c) => (
        <span
          key={c.left}
          className="absolute top-10 animate-float font-mono text-xs text-ink-300/40 blur-[0.4px]"
          style={{ left: c.left, animationDelay: c.delay, animationDuration: c.dur }}
        >
          {c.text}
        </span>
      ))}
    </>
  );
}

function ScrollCue() {
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 sm:block">
      <div className="flex flex-col items-center gap-2 text-ink-300">
        <span className="mono-label">scroll</span>
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="h-8 w-px bg-ink-300"
        />
      </div>
    </div>
  );
}

/* --------------------- the looping transform card ------------------------- */

type Phase = "clear" | "wrapping" | "encrypted" | "revealing";

function TransformCard() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("clear");

  useEffect(() => {
    if (reduce) {
      setPhase("encrypted");
      return;
    }
    const seq: { p: Phase; ms: number }[] = [
      { p: "clear", ms: 1600 },
      { p: "wrapping", ms: 1400 },
      { p: "encrypted", ms: 2000 },
      { p: "revealing", ms: 1800 },
    ];
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      setPhase(seq[i].p);
      timer = setTimeout(() => {
        i = (i + 1) % seq.length;
        run();
      }, seq[i].ms);
    };
    run();
    return () => clearTimeout(timer);
  }, [reduce]);

  const encrypted = phase === "encrypted" || phase === "wrapping";

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* window chrome */}
      <div className="glass overflow-hidden rounded-xl">
        <div className="flex items-center gap-2 border-b border-white/40 bg-white/30 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full border border-black/10 bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full border border-black/10 bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full border border-black/10 bg-[#28c840]" />
          <span className="ml-2 font-mono text-2xs uppercase tracking-[0.14em] text-ink-400">
            wrap · cUSDC
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-2xs text-ink-400">
            {encrypted ? <Lock width={12} height={12} /> : <Check width={12} height={12} />}
            {phaseLabel(phase)}
          </span>
        </div>

        <div className="space-y-3 p-5">
          {/* clear ERC-20 side */}
          <Row glyph={<TokenGlyph symbol="USDC" size={34} />} label="USD Coin" sub="ERC-20 · public">
            <span className="font-display text-xl font-semibold tabular">1,000.00</span>
          </Row>

          <div className="flex items-center justify-center">
            <motion.span
              animate={phase === "wrapping" ? { y: [0, 4, 0] } : {}}
              transition={{ duration: 0.8, repeat: phase === "wrapping" ? Infinity : 0 }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper-raised text-ink-500"
            >
              <ArrowRight width={15} height={15} className="rotate-90" />
            </motion.span>
          </div>

          {/* confidential ERC-7984 side */}
          <Row
            glyph={<TokenGlyph symbol="cUSDC" confidential size={34} />}
            label="Confidential USDC"
            sub="ERC-7984 · encrypted"
            dark
          >
            <div className="relative h-7 w-32 overflow-hidden">
              <motion.span
                key={encrypted ? "enc" : "clr"}
                initial={{ opacity: 0, filter: "blur(8px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.5 }}
                className="absolute right-0 font-display text-xl font-semibold tabular"
              >
                {encrypted ? (
                  <span className="text-paper/40">████ ██</span>
                ) : (
                  <span className="text-paper">1,000.00</span>
                )}
              </motion.span>
            </div>
          </Row>
        </div>
      </div>

      {/* floating caption */}
      <div className="glass absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5">
        <span className="whitespace-nowrap font-mono text-2xs uppercase tracking-[0.12em] text-ink-500">
          {phase === "revealing" ? "decrypted to you · EIP-712" : "balance hidden onchain"}
        </span>
      </div>
    </div>
  );
}

function phaseLabel(p: Phase) {
  switch (p) {
    case "clear":
      return "ready";
    case "wrapping":
      return "wrapping…";
    case "encrypted":
      return "encrypted";
    case "revealing":
      return "decrypting…";
  }
}

function Row({
  glyph,
  label,
  sub,
  children,
  dark,
}: {
  glyph: ReactNode;
  label: string;
  sub: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between rounded-lg border p-4 " +
        (dark ? "border-ink-900 bg-ink-900 text-paper" : "border-white/50 bg-white/45")
      }
    >
      <div className="flex items-center gap-3">
        {glyph}
        <div>
          <div className="text-sm font-medium leading-tight">{label}</div>
          <div className={"text-2xs " + (dark ? "text-ink-300" : "text-ink-400")}>{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}
