import type { ComponentType, SVGProps } from "react";
import { clsx } from "@/lib/cn";

/**
 * Doodles — hand-drawn "encrypted" marginalia.
 *
 * A small set of crypto/confidentiality glyphs (locks, keys, ciphertext blocks,
 * redacted scribbles…) drawn loose and sketchy, then run through a single SVG
 * displacement filter so every stroke gets a pencil-on-paper wobble. They live
 * as a faint, pointer-events-none layer behind each section's content — the same
 * "whisper, not shout" register as the engineering grid and the drifting cipher.
 *
 * Usage:
 *   1. Mount <DoodleDefs /> once near the app root (it just injects the filter).
 *   2. Drop <SectionDoodles variant="why" /> as the FIRST child of a `relative`
 *      section; make sure the section's content wrapper is also `relative` so it
 *      paints above the doodle layer.
 */

type DProps = SVGProps<SVGSVGElement>;

/* ----------------------------- shared filter ----------------------------- */

/**
 * The hand-drawn wobble. feTurbulence makes noise; feDisplacementMap shoves the
 * clean vector strokes around by it. Rendered once; every doodle references it.
 */
export function DoodleDefs() {
  return (
    <svg
      width={0}
      height={0}
      aria-hidden
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter id="doodle-rough" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035"
            numOctaves={2}
            seed={7}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={2}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

/* ------------------------------ the glyphs ------------------------------- */

/** Common sketch frame: loose strokes, round caps, run through the wobble. */
function Sketch({ children, ...p }: DProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={40}
      height={40}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      <g filter="url(#doodle-rough)">{children}</g>
    </svg>
  );
}

export const DoodleLock = (p: DProps) => (
  <Sketch {...p}>
    <path d="M16 22v-4a8 8 0 0 1 16 0v4" />
    <rect x="12" y="22" width="24" height="16" rx="3" />
    <circle cx="24" cy="29" r="2.2" />
    <path d="M24 31v4" />
  </Sketch>
);

export const DoodleKey = (p: DProps) => (
  <Sketch {...p}>
    <circle cx="16" cy="16" r="7" />
    <circle cx="16" cy="16" r="2" />
    <path d="M20.8 20.8 36 36" />
    <path d="M36 36l4-1M32 32l3-1" />
  </Sketch>
);

export const DoodleShield = (p: DProps) => (
  <Sketch {...p}>
    <path d="M24 7l13 5v9c0 9-6 14-13 18-7-4-13-9-13-18v-9z" />
    <path d="M18 24l4 4 8-9" />
  </Sketch>
);

export const DoodleEyeOff = (p: DProps) => (
  <Sketch {...p}>
    <path d="M8 24c5-8 27-8 32 0-5 8-27 8-32 0z" />
    <circle cx="24" cy="24" r="4" />
    <path d="M11 11 37 37" />
  </Sketch>
);

export const DoodleSparkle = (p: DProps) => (
  <Sketch {...p}>
    <path d="M24 8c2 9 5 12 14 14-9 2-12 5-14 14-2-9-5-12-14-14 9-2 12-5 14-14z" />
  </Sketch>
);

/** A six-spoke asterisk — the "masked value" mark. */
export const DoodleAsterisk = (p: DProps) => (
  <Sketch {...p}>
    <path d="M24 11v26M14 17l20 14M34 17 14 31" />
  </Sketch>
);

/** A slanted hash — onchain handle vibe. */
export const DoodleHash = (p: DProps) => (
  <Sketch {...p}>
    <path d="M20 12 15 36M31 12l-5 24M13 20h22M11 28h22" />
  </Sketch>
);

/** `</>` — code / cipher. */
export const DoodleCode = (p: DProps) => (
  <Sketch {...p}>
    <path d="M18 16 10 24l8 8" />
    <path d="M30 16l8 8-8 8" />
    <path d="M27 12 21 36" />
  </Sketch>
);

/** Redacted / encrypted text — three blurred wavy rows. */
export const DoodleRedacted = (p: DProps) => (
  <Sketch {...p}>
    <path d="M10 17q4-3 8 0t8 0 8 0" />
    <path d="M10 25q4-3 8 0t8 0 6 0" />
    <path d="M10 33q4-3 8 0t6 0" />
  </Sketch>
);

/** Wrap ⇄ unwrap cycle. */
export const DoodleCycle = (p: DProps) => (
  <Sketch {...p}>
    <path d="M35 18a13 13 0 1 0 3 9" />
    <path d="M35 18l-6-1M35 18l1 6" />
  </Sketch>
);

/** Hexagon node — a generic crypto token. */
export const DoodleHex = (p: DProps) => (
  <Sketch {...p}>
    <path d="M24 8l14 8v16l-14 8-14-8V16z" />
    <circle cx="24" cy="24" r="3" />
  </Sketch>
);

/** Biometric / fingerprint arcs. */
export const DoodlePrint = (p: DProps) => (
  <Sketch {...p}>
    <path d="M15 31c0-9 4-14 9-14s9 5 9 14" />
    <path d="M19 32c0-6 2-10 5-10s5 4 5 10" />
    <path d="M23 33c0-4 1-7 2-7" />
  </Sketch>
);

/** Ciphertext blocks — the ████ motif, as a little cipher grid. */
export const DoodleBlocks = (p: DProps) => (
  <Sketch {...p}>
    <rect x="11" y="13" width="9" height="9" rx="1.5" fill="currentColor" stroke="none" />
    <rect x="23" y="13" width="9" height="9" rx="1.5" />
    <rect x="11" y="25" width="9" height="9" rx="1.5" />
    <rect x="23" y="25" width="9" height="9" rx="1.5" fill="currentColor" stroke="none" />
  </Sketch>
);

/** Padlock mid-shimmer — body with a tiny sparkle. */
export const DoodleLockSpark = (p: DProps) => (
  <Sketch {...p}>
    <path d="M15 21v-3a7 7 0 0 1 14 0v3" />
    <rect x="11" y="21" width="22" height="15" rx="3" />
    <path d="M38 12c.7 3 1.5 3.8 4 4-2.5.7-3.3 1.5-4 4-.7-2.5-1.5-3.3-4-4 2.5-.6 3.3-1.4 4-4z" />
  </Sketch>
);

/* ---------------------------- the scatter layer -------------------------- */

type Anim = "float" | "wiggle";
type Place = {
  D: ComponentType<DProps>;
  pos: string; // tailwind absolute-position utilities
  size: number;
  rot?: number; // static tilt, degrees
  op?: number; // per-item opacity (depth)
  dur?: string; // animation-duration
  delay?: string; // animation-delay
  anim?: Anim;
  mobile?: boolean; // render on small screens (default false → sm+ only)
};

/**
 * Per-section arrangements. Doodles hug the gutters / margins so they never
 * collide with copy. Variants differ so no two sections feel stamped.
 */
const VARIANTS: Record<string, Place[]> = {
  hero: [
    { D: DoodleLock, pos: "left-[3%] top-[26%]", size: 46, rot: -10, op: 0.8, dur: "8s", anim: "wiggle" },
    { D: DoodleAsterisk, pos: "left-[8%] bottom-[16%]", size: 30, rot: 8, op: 0.6, dur: "7s", delay: "0.6s" },
    { D: DoodleRedacted, pos: "left-[18%] top-[14%]", size: 40, rot: -4, op: 0.5, dur: "9s", delay: "1.1s" },
    { D: DoodleHex, pos: "right-[2%] bottom-[10%]", size: 36, rot: 12, op: 0.5, dur: "10s", delay: "0.3s" },
  ],
  how: [
    { D: DoodleShield, pos: "right-[3%] top-16", size: 44, rot: 9, op: 0.7, dur: "9s", anim: "wiggle" },
    { D: DoodleCycle, pos: "left-[2%] bottom-12", size: 40, rot: -8, op: 0.55, dur: "8s", delay: "0.5s" },
    { D: DoodleKey, pos: "right-[8%] bottom-10", size: 34, rot: 16, op: 0.6, dur: "7.5s", delay: "1s" },
  ],
  why: [
    { D: DoodleAsterisk, pos: "right-[4%] top-24", size: 34, rot: -12, op: 0.7, dur: "7s", anim: "wiggle" },
    { D: DoodleHash, pos: "left-[2%] top-1/2", size: 38, rot: 7, op: 0.5, dur: "9s", delay: "0.4s" },
    { D: DoodleBlocks, pos: "left-[6%] bottom-12", size: 36, rot: -6, op: 0.6, dur: "8s", delay: "0.9s" },
    { D: DoodleHex, pos: "right-[5%] bottom-16", size: 32, rot: 14, op: 0.5, dur: "10s", delay: "0.2s" },
  ],
  decrypt: [
    { D: DoodleEyeOff, pos: "left-[3%] top-20", size: 44, rot: -8, op: 0.7, dur: "9s", anim: "wiggle" },
    { D: DoodleKey, pos: "right-[4%] top-1/3", size: 38, rot: 12, op: 0.6, dur: "7.5s", delay: "0.7s" },
    { D: DoodlePrint, pos: "left-[7%] bottom-14", size: 36, rot: 6, op: 0.5, dur: "8.5s", delay: "1.2s" },
  ],
  add: [
    { D: DoodleCode, pos: "right-[3%] top-24", size: 42, rot: 10, op: 0.7, dur: "8s", anim: "wiggle" },
    { D: DoodleBlocks, pos: "left-[2%] top-1/2", size: 34, rot: -7, op: 0.5, dur: "9s", delay: "0.6s" },
    { D: DoodleHash, pos: "left-[8%] bottom-12", size: 36, rot: 9, op: 0.55, dur: "7.5s", delay: "1s" },
  ],
  faq: [
    { D: DoodleLockSpark, pos: "left-[3%] top-20", size: 44, rot: -9, op: 0.7, dur: "8.5s", anim: "wiggle" },
    { D: DoodleSparkle, pos: "left-[10%] bottom-16", size: 30, rot: 6, op: 0.6, dur: "7s", delay: "0.8s" },
    { D: DoodleRedacted, pos: "left-[1%] top-1/2", size: 34, rot: -4, op: 0.45, dur: "9s", delay: "0.4s" },
  ],
  cta: [
    { D: DoodleLock, pos: "right-[5%] top-16", size: 48, rot: 11, op: 0.9, dur: "9s", anim: "wiggle" },
    { D: DoodleSparkle, pos: "right-[14%] bottom-20", size: 32, rot: -8, op: 0.8, dur: "7s", delay: "0.6s" },
    { D: DoodleKey, pos: "left-[5%] bottom-16", size: 40, rot: -14, op: 0.85, dur: "8s", delay: "1s" },
    { D: DoodleHex, pos: "left-[12%] top-20", size: 30, rot: 9, op: 0.7, dur: "10s", delay: "0.3s" },
  ],
  console: [
    { D: DoodleKey, pos: "left-[2.5%] top-44", size: 42, rot: -12, op: 0.7, dur: "8s", anim: "wiggle" },
    { D: DoodleLock, pos: "right-[2.5%] top-56", size: 44, rot: 10, op: 0.7, dur: "9s", delay: "0.5s", anim: "wiggle" },
    { D: DoodleRedacted, pos: "right-[3%] bottom-40", size: 38, rot: -6, op: 0.55, dur: "9s", delay: "1.1s" },
    { D: DoodleBlocks, pos: "left-[3.5%] bottom-44", size: 36, rot: 8, op: 0.6, dur: "8s", delay: "0.8s" },
    { D: DoodleAsterisk, pos: "left-[5%] top-1/2", size: 28, rot: 6, op: 0.5, dur: "7s", delay: "0.3s" },
    { D: DoodleHex, pos: "right-[5%] top-1/3", size: 30, rot: 14, op: 0.5, dur: "10s", delay: "0.6s" },
  ],
  // The docs page is many screens tall, so its doodles are pinned to vertical
  // percentages across the whole length rather than to a single section's box —
  // otherwise the long scroll reads as bare between the top and bottom.
  docs: [
    { D: DoodleCode, pos: "right-[3%] top-[5%]", size: 42, rot: 10, op: 0.7, dur: "8s", anim: "wiggle" },
    { D: DoodleLock, pos: "left-[2%] top-[12%]", size: 40, rot: -9, op: 0.6, dur: "9s", delay: "0.5s", anim: "wiggle" },
    { D: DoodleHash, pos: "left-[7%] top-[19%]", size: 34, rot: 8, op: 0.5, dur: "7.5s", delay: "1s" },
    { D: DoodleBlocks, pos: "right-[4%] top-[27%]", size: 36, rot: -7, op: 0.55, dur: "9s", delay: "0.4s" },
    { D: DoodleKey, pos: "right-[3%] top-[36%]", size: 38, rot: 12, op: 0.6, dur: "8s", delay: "0.9s", anim: "wiggle" },
    { D: DoodleRedacted, pos: "left-[2%] top-[44%]", size: 38, rot: -5, op: 0.5, dur: "9s", delay: "0.6s" },
    { D: DoodleAsterisk, pos: "left-[6%] top-[53%]", size: 30, rot: 7, op: 0.55, dur: "7s", delay: "0.2s" },
    { D: DoodleHex, pos: "right-[5%] top-[61%]", size: 34, rot: 14, op: 0.5, dur: "10s", delay: "0.7s" },
    { D: DoodleShield, pos: "right-[3%] top-[70%]", size: 42, rot: 9, op: 0.6, dur: "9s", delay: "0.3s", anim: "wiggle" },
    { D: DoodleCycle, pos: "left-[3%] top-[78%]", size: 38, rot: -8, op: 0.55, dur: "8s", delay: "1.1s" },
    { D: DoodlePrint, pos: "left-[8%] top-[87%]", size: 34, rot: 6, op: 0.5, dur: "8.5s", delay: "0.5s" },
    { D: DoodleLockSpark, pos: "right-[4%] top-[94%]", size: 40, rot: 11, op: 0.6, dur: "8.5s", delay: "0.8s", anim: "wiggle" },
  ],
};

export function SectionDoodles({
  variant,
  tone = "light",
  className,
}: {
  variant: keyof typeof VARIANTS;
  tone?: "light" | "dark";
  className?: string;
}) {
  const items = VARIANTS[variant] ?? [];
  return (
    <div
      aria-hidden
      className={clsx(
        "pointer-events-none absolute inset-0 overflow-hidden",
        tone === "dark" ? "text-white/[0.13]" : "text-ink-300/70",
        className,
      )}
    >
      {items.map((it, i) => {
        const D = it.D;
        return (
          <span
            key={i}
            className={clsx("absolute", it.pos, it.mobile ? "" : "hidden sm:block")}
            style={{ transform: it.rot ? `rotate(${it.rot}deg)` : undefined, opacity: it.op }}
          >
            <D
              width={it.size}
              height={it.size}
              className={clsx(
                it.anim === "wiggle" ? "animate-wiggle" : "animate-float",
                "motion-reduce:animate-none",
              )}
              style={{ animationDuration: it.dur ?? "8s", animationDelay: it.delay ?? "0s" }}
            />
          </span>
        );
      })}
    </div>
  );
}
