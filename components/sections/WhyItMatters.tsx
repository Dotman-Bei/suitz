"use client";

import { Reveal } from "@/components/motion/Reveal";
import { Counter } from "@/components/motion/Counter";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { Close, Check } from "@/components/ui/Icons";
import { SectionDoodles } from "@/components/decor/Doodles";

const LOOKALIKES = [
  { s: "cUSDC", t: "12%", l: "4%", r: "-6deg" },
  { s: "USDc.x", t: "48%", l: "30%", r: "5deg" },
  { s: "confUSD", t: "8%", l: "55%", r: "-3deg" },
  { s: "cUSDCv2", t: "62%", l: "12%", r: "7deg" },
  { s: "cUSD", t: "30%", l: "68%", r: "-8deg" },
  { s: "USDx", t: "70%", l: "58%", r: "4deg" },
  { s: "fheUSD", t: "40%", l: "44%", r: "9deg" },
];

const CANONICAL = ["cUSDC", "cDAI", "cWETH"];

export function WhyItMatters() {
  return (
    <section id="why" className="relative scroll-mt-24 border-t border-line py-24">
      <SectionDoodles variant="why" />
      <div className="shell relative">
        <Reveal>
          <p className="eyebrow">02 · Why it matters</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Fragmentation is the enemy of composability.
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-600">
            When every team spins up its own confidential token, wallets fill with
            look-alikes that don&apos;t interoperate. suitz makes the canonical pair
            the path of least resistance.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* problem */}
          <Reveal>
            <div className="relative h-full overflow-hidden rounded-2xl border border-line bg-paper-sunken p-7">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line-strong text-ink-400">
                  <Close width={13} height={13} />
                </span>
                <span className="mono-label">Without a registry</span>
              </div>
              <div className="relative mt-4 h-56">
                {LOOKALIKES.map((c) => (
                  <span
                    key={c.s}
                    style={{ top: c.t, left: c.l, rotate: c.r }}
                    className="absolute inline-flex items-center gap-1.5 rounded-sm border border-dashed border-line-strong bg-paper px-2.5 py-1 font-mono text-xs text-ink-400"
                  >
                    {c.s}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                Seven “confidential USD” tokens. None of them compose. Users can&apos;t
                tell which is real.
              </p>
            </div>
          </Reveal>

          {/* solution */}
          <Reveal delay={0.1}>
            <div className="relative h-full overflow-hidden rounded-2xl border border-ink-900 bg-ink-900 p-7 text-paper">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper text-ink-900">
                  <Check width={13} height={13} />
                </span>
                <span className="mono-label text-ink-300">With suitz</span>
              </div>
              <div className="mt-6 space-y-3">
                {CANONICAL.map((s) => (
                  <div
                    key={s}
                    className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-800 px-4 py-3"
                  >
                    <span className="font-mono text-sm">{s}</span>
                    <SourceBadge source="official" />
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm leading-relaxed text-ink-300">
                One canonical set, read straight from the onchain registry. Everyone
                points to the same addresses.
              </p>
            </div>
          </Reveal>
        </div>

        {/* stat band */}
        <Reveal delay={0.15}>
          <div className="glass mt-6 grid grid-cols-2 divide-x divide-line/60 rounded-2xl sm:grid-cols-4">
            <Metric value={1} label="Source of truth" />
            <Metric value={7} label="Official pairs" />
            <Metric value={0} label="Forks you need" />
            <Metric value={100} suffix="%" label="Onchain-sourced" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Metric({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="px-6 py-7">
      <div className="font-display text-4xl font-semibold tabular tracking-tight">
        <Counter value={value} suffix={suffix} />
      </div>
      <div className="mt-1 mono-label">{label}</div>
    </div>
  );
}
