"use client";

import { motion } from "framer-motion";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Shield, Faucet, Swap, Key, ArrowRight } from "@/components/ui/Icons";
import { SectionDoodles } from "@/components/decor/Doodles";
import type { ComponentType, SVGProps } from "react";

const STEPS: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
}[] = [
  { icon: Shield, title: "Browse", body: "Read the official onchain registry. Every canonical ERC-20 ↔ ERC-7984 pair, with metadata and both addresses." },
  { icon: Faucet, title: "Faucet", body: "Claim the official cTokenMocks on Sepolia. A fresh wallet is ready to try everything in under a minute." },
  { icon: Swap, title: "Wrap", body: "Approve, then wrap an ERC-20 into its confidential ERC-7984 form. Your new balance arrives encrypted." },
  { icon: Key, title: "Decrypt", body: "Sign once (EIP-712) to reveal your balance on any ERC-7984 token, in the registry or not." },
  { icon: ArrowRight, title: "Unwrap", body: "Burn the confidential token; the decryption oracle finalizes; your ERC-20 is released. We wait honestly." },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-24 border-t border-line bg-paper-raised py-24">
      <SectionDoodles variant="how" />
      <div className="shell relative">
        <Reveal>
          <p className="eyebrow">01 · How it works</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Five steps from public to private and back.
          </h2>
        </Reveal>

        <div className="relative mt-14">
          {/* drawn connector */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute left-0 top-7 hidden h-px w-full origin-left bg-line-strong lg:block"
          />

          <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5" stagger={0.12}>
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <RevealItem key={s.title}>
                  <div className="group relative">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-line-strong bg-paper transition-colors duration-300 group-hover:border-ink-900 group-hover:bg-ink-900 group-hover:text-paper">
                      <Icon width={20} height={20} />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 font-mono text-2xs text-paper">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.body}</p>
                  </div>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
