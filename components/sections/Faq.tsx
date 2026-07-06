"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "@/components/motion/Reveal";
import { Plus } from "@/components/ui/Icons";
import { SectionDoodles } from "@/components/decor/Doodles";
import { clsx } from "@/lib/cn";

const QA = [
  {
    q: "What is an ERC-7984 token?",
    a: "It is Zama's confidential fungible token standard. Balances and transfers are encrypted onchain using FHE, so amounts stay private while still being verifiable. A wrapper mints an ERC-7984 against a deposited ERC-20.",
  },
  {
    q: "How does suitz source the registry?",
    a: "Primarily from the official onchain WrappersRegistry on Sepolia, which is the source of truth. A local config (config/pairs.ts) can layer dev-only pairs on top. On collision the onchain record always wins.",
  },
  {
    q: "Why does unwrapping take a moment?",
    a: "Unwrap burns the confidential token and asks the FHEVM decryption oracle to reveal the amount before the ERC-20 is released. That oracle round-trip is asynchronous, so suitz shows an honest 'finalizing' state instead of pretending it is instant.",
  },
  {
    q: "Can I decrypt a token that isn't in the registry?",
    a: "Yes. The Decrypt tab works on any ERC-7984 address you paste or that is auto-detected in your wallet, using the EIP-712 user-decryption flow. The value is revealed only to the connected wallet.",
  },
  {
    q: "Is this safe to use?",
    a: "Everything runs on Sepolia testnet with official cTokenMocks that hold no value. Decryption happens locally after a signature; suitz is non-custodial and never sees your balances.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative scroll-mt-24 border-t border-line bg-paper-raised py-24">
      <SectionDoodles variant="faq" />
      <div className="shell relative grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <p className="eyebrow">05 · FAQ</p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Questions, answered.
          </h2>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="divide-y divide-line border-y border-line">
            {QA.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-display text-lg font-medium tracking-tight">{item.q}</span>
                    <span
                      className={clsx(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                        isOpen ? "rotate-45 border-ink-900 bg-ink-900 text-paper" : "border-line-strong text-ink-500",
                      )}
                    >
                      <Plus width={15} height={15} />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-xl pb-6 text-[0.95rem] leading-relaxed text-ink-600">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
