"use client";

import { useRef, type ComponentType } from "react";
import { useStore, type Tab } from "@/components/providers/AppStore";
import { TabNav } from "@/components/nav/TabNav";
import { NetworkBadge } from "@/components/layout/NetworkBadge";
import { RegistryView } from "@/components/views/RegistryView";
import { WrapView } from "@/components/views/WrapView";
import { DecryptView } from "@/components/views/DecryptView";
import { FaucetView } from "@/components/views/FaucetView";

const VIEWS: { id: Tab; View: ComponentType }[] = [
  { id: "registry", View: RegistryView },
  { id: "wrap", View: WrapView },
  { id: "decrypt", View: DecryptView },
  { id: "faucet", View: FaucetView },
];

/** The framed, window-chrome console that hosts all four flows. */
export function Console() {
  const { tab } = useStore();

  // Keep-alive: once a tab has been opened its view stays mounted (just hidden),
  // so an in-progress wrap / unwrap / decrypt survives switching panels.
  const visited = useRef(new Set<Tab>());
  visited.current.add(tab);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-pop">
      {/* window chrome — glassy bar */}
      <div className="flex items-center gap-2 border-b border-line bg-white/55 px-5 py-3.5 backdrop-blur-md backdrop-saturate-150 sm:px-8">
        <span className="h-3 w-3 rounded-full border border-black/10 bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full border border-black/10 bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full border border-black/10 bg-[#28c840]" />
        <span className="ml-3 font-mono text-2xs uppercase tracking-[0.16em] text-ink-500">
          console
        </span>
        <span className="ml-auto">
          <NetworkBadge />
        </span>
      </div>

      {/* tabs */}
      <div className="border-b border-line bg-paper">
        <TabNav />
      </div>

      {/* body — visited views stay mounted; only the active one is shown */}
      <div className="min-h-[460px] bg-paper">
        {VIEWS.map(({ id, View }) =>
          visited.current.has(id) ? (
            <div key={id} className={id === tab ? "animate-fade-up" : "hidden"}>
              <View />
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
