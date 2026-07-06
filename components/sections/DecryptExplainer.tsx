"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Key, Check } from "@/components/ui/Icons";
import { SectionDoodles } from "@/components/decor/Doodles";
import { useStore } from "@/components/providers/AppStore";

const BULLETS = [
  "No gas, no transaction. Just one signature.",
  "Scoped to the connected wallet; nobody else can read it.",
  "Works on any ERC-7984 token, registered or not.",
  "Re-encrypted to your key and decrypted in your browser.",
];

export function DecryptExplainer() {
  const { setTab } = useStore();
  const router = useRouter();

  return (
    <section className="relative scroll-mt-24 border-t border-line bg-paper-raised py-24">
      <SectionDoodles variant="decrypt" />
      <div className="shell relative grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <Reveal>
          <p className="eyebrow">03 · Confidentiality</p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Your balance, revealed only to you.
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-ink-600">
            ERC-7984 balances live onchain as encrypted handles. suitz turns a
            handle into a number through the EIP-712 user-decryption flow, without
            ever seeing the value itself.
          </p>
          <ul className="mt-7 space-y-3">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-ink-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-paper">
                  <Check width={12} height={12} />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <Button
            className="mt-8"
            variant="outline"
            onClick={() => {
              setTab("decrypt");
              router.push("/console");
            }}
          >
            <Key width={16} height={16} /> Try it in the console
          </Button>
        </Reveal>

        <Reveal delay={0.1}>
          <DecryptPipeline />
        </Reveal>
      </div>
    </section>
  );
}

function DecryptPipeline() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) {
      setActive(2);
      return;
    }
    const id = setInterval(() => setActive((a) => (a + 1) % 3), 1600);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div className="rounded-2xl border border-line bg-paper p-6 shadow-pop sm:p-8">
      <Node
        active={active === 0}
        index="01"
        label="Encrypted handle"
        caption="confidentialBalanceOf(you)"
      >
        <code className="ciphertext-strong text-base">0x9f3a7c…1e</code>
      </Node>

      <Connector label="read" />

      <Node active={active === 1} index="02" label="EIP-712 grant" caption="sign once · no gas">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-ink-700">keypair + typed-data</span>
          <motion.span
            animate={active === 1 ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.6, repeat: active === 1 ? Infinity : 0 }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-paper"
          >
            <Key width={13} height={13} />
          </motion.span>
        </div>
      </Node>

      <Connector label="userDecrypt" />

      <Node active={active === 2} index="03" label="Cleartext, only you" caption="decrypted locally" dark>
        <motion.span
          key={active === 2 ? "rev" : "hid"}
          initial={{ opacity: 0, filter: "blur(8px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.5 }}
          className="font-display text-2xl font-semibold tabular"
        >
          {active === 2 ? "842.50 cUSDC" : <span className="text-paper/40">████ ██</span>}
        </motion.span>
      </Node>
    </div>
  );
}

function Node({
  active,
  index,
  label,
  caption,
  children,
  dark,
}: {
  active: boolean;
  index: string;
  label: string;
  caption: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-4 transition-all duration-300 " +
        (dark
          ? "border-ink-900 bg-ink-900 text-paper"
          : active
            ? "border-ink-900 bg-paper"
            : "border-line bg-paper") +
        (active && !dark ? " shadow-sm" : "")
      }
      data-active={active}
    >
      <div className="flex items-center justify-between">
        <span className={"mono-label " + (dark ? "text-ink-300" : "")}>
          <span className="mr-2 text-ink-400">{index}</span>
          {label}
        </span>
        {active && (
          <span className={"flex h-2 w-2 rounded-full " + (dark ? "bg-paper" : "bg-ink-900")} />
        )}
      </div>
      <div className="mt-3">{children}</div>
      <div className={"mt-2 font-mono text-2xs " + (dark ? "text-ink-400" : "text-ink-400")}>
        {caption}
      </div>
    </div>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3 pl-4">
      <ArrowRight width={15} height={15} className="rotate-90 text-ink-300" />
      <span className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-400">{label}</span>
    </div>
  );
}
