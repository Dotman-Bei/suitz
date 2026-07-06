"use client";

import { clsx } from "@/lib/cn";
import { useWallet } from "@/components/providers/WalletProvider";
import { Globe } from "@/components/ui/Icons";

export function NetworkBadge() {
  const { network, switchToSepolia } = useWallet();

  if (network.supported) {
    return (
      <span className="badge badge-muted gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink-400 opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-ink-900" />
        </span>
        {network.name}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={switchToSepolia}
      className="badge border-signal-error/40 bg-signal-errorbg text-signal-error hover:border-signal-error"
    >
      <Globe width={12} height={12} />
      Switch to Sepolia
    </button>
  );
}
