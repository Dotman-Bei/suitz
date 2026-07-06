"use client";

import { motion } from "framer-motion";
import { useStore, type Tab } from "@/components/providers/AppStore";
import { Shield, Swap, Key, Faucet } from "@/components/ui/Icons";
import type { ComponentType, SVGProps } from "react";

const TABS: {
  id: Tab;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /**
   * Active flourish: a number settles the icon at that angle; an array plays a
   * keyframe wiggle (and returns).
   */
  spin?: number | number[];
}[] = [
  { id: "registry", label: "Registry", icon: Shield },
  { id: "wrap", label: "Wrap / Unwrap", icon: Swap, spin: 180 },
  { id: "decrypt", label: "Decrypt Any", icon: Key, spin: -45 },
  { id: "faucet", label: "Faucet", icon: Faucet, spin: [0, -20, 12, 0] },
];

/** In-card tab strip for the console frame. */
export function TabNav() {
  const { tab, setTab } = useStore();

  return (
    <nav className="flex items-center gap-6 overflow-x-auto px-5 sm:px-8">
      {TABS.map((t, i) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            data-active={active}
            className="tab"
            aria-current={active ? "page" : undefined}
          >
            <span className="tab-index">{String(i + 1).padStart(2, "0")}</span>
            <motion.span
              className="inline-flex"
              initial={false}
              animate={{
                scale: active ? [1, 1.35, 1] : 1,
                rotate: active ? t.spin ?? 0 : 0,
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.8 }}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Icon width={16} height={16} />
            </motion.span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
