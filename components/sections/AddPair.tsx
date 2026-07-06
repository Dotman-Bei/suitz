"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal } from "@/components/motion/Reveal";
import { Copy, Check } from "@/components/ui/Icons";
import { SectionDoodles } from "@/components/decor/Doodles";

type Mode = "local" | "onchain";

const LOCAL_CODE = `// config/pairs.ts: the local override layer.
// Just the ERC-7984 wrapper address: the underlying ERC-20 and all
// metadata (symbol / name / decimals) are read onchain automatically.
LOCAL_PAIRS.push({
  confidential: "0xYourErc7984Wrapper",
  note: "my hackathon token", // optional
});
// save → it appears in the Registry tab, badged "local"
// (or skip the file entirely: use the "Add pair" button in the app)`;

const ONCHAIN_CODE = `// Register the pair in the official WrappersRegistry (Sepolia).
// onlyOwner: Zama registers canonical pairs; the confidential token must
// advertise ERC-165 supportsInterface(0x4958f2a4), the ERC-7984 interface id.
registry.registerConfidentialToken(
  tokenAddress,            // 0x… your ERC-20
  confidentialTokenAddress // 0x… its ERC-7984 wrapper
);

// suitz reads it on the next refresh as "official"
// → zero app code changes. That is the point.`;

export function AddPair() {
  const [mode, setMode] = useState<Mode>("local");
  const code = mode === "local" ? LOCAL_CODE : ONCHAIN_CODE;

  return (
    <section id="docs" className="relative scroll-mt-24 border-t border-line py-24">
      <SectionDoodles variant="add" />
      <div className="shell relative grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <p className="eyebrow">04 · Extensibility</p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Add a pair in one minute.
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-600">
            The registry is a hybrid: the onchain WrappersRegistry is the source of
            truth, and a local config layers dev-only pairs on top. On collision,
            onchain always wins; local never masquerades as official.
          </p>
          <dl className="mt-8 space-y-5">
            <div>
              <dt className="font-display text-lg font-semibold">Local</dt>
              <dd className="mt-1 text-sm text-ink-600">
                Drop one wrapper address into <code className="font-mono text-ink-900">config/pairs.ts</code>,{" "}
                or use the in-app <span className="font-medium text-ink-900">Add pair</span> button.
                Instant, no onchain registration.
              </dd>
            </div>
            <div className="rule" />
            <div>
              <dt className="font-display text-lg font-semibold">Onchain</dt>
              <dd className="mt-1 text-sm text-ink-600">
                Register canonically in the WrappersRegistry. suitz surfaces it as
                official automatically.
              </dd>
            </div>
          </dl>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-line bg-ink-900 shadow-pop">
            {/* toolbar */}
            <div className="flex items-center gap-1 border-b border-ink-800 px-3 py-2.5">
              {(["local", "onchain"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={
                    "rounded-sm px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.1em] transition " +
                    (mode === m ? "bg-paper text-ink-900" : "text-ink-400 hover:text-paper")
                  }
                >
                  {m}
                </button>
              ))}
              <span className="ml-auto pr-1">
                <CopyButton text={code} />
              </span>
            </div>
            {/* code */}
            <AnimatePresence mode="wait">
              <motion.pre
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="overflow-x-auto px-5 py-5 font-mono text-[0.8rem] leading-relaxed text-ink-200"
              >
                <code>{code}</code>
              </motion.pre>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* no-op */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-2xs text-ink-400 hover:text-paper"
    >
      {copied ? <Check width={13} height={13} /> : <Copy width={13} height={13} />}
      {copied ? "copied" : "copy"}
    </button>
  );
}
