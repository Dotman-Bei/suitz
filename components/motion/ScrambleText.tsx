"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { clsx } from "@/lib/cn";

const GLYPHS = "0123456789abcdef▒▓░#$%&";

/**
 * The signature text effect: a string resolves out of cycling ciphertext —
 * a "decryption" in type. Used on hero lines and section labels.
 */
export function ScrambleText({
  text,
  className,
  speed = 28,
  startDelay = 0,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  speed?: number;
  startDelay?: number;
  as?: "span" | "h1" | "h2" | "p";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [output, setOutput] = useState(reduce ? text : "");

  useEffect(() => {
    if (!inView || reduce) {
      setOutput(text);
      return;
    }
    let frame = 0;
    let raf = 0;
    let timeout: ReturnType<typeof setTimeout>;
    const total = text.length;

    const run = () => {
      const settled = Math.floor(frame / 2);
      let next = "";
      for (let i = 0; i < total; i++) {
        if (text[i] === " ") {
          next += " ";
        } else if (i < settled) {
          next += text[i];
        } else {
          next += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      setOutput(next);
      frame += 1;
      if (settled <= total) raf = requestAnimationFrame(() => setTimeout(run, speed));
    };

    timeout = setTimeout(run, startDelay);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [inView, text, speed, startDelay, reduce]);

  return (
    <Tag ref={ref as never} className={clsx(className)} aria-label={text}>
      <span aria-hidden>{output || " "}</span>
    </Tag>
  );
}
