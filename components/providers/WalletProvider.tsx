"use client";

import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { sepolia } from "wagmi/chains";
import type { Address, NetworkInfo } from "@/lib/types";

/**
 * Real wallet state, backed by wagmi. Exposes the same shape the UI was built
 * against (the former mock), so no component changes were needed to go live.
 */
export function useWallet() {
  const { address, isConnected, chainId: accountChainId } = useAccount();
  const fallbackChainId = useChainId();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const chainId = accountChainId ?? fallbackChainId;
  const supported = chainId === sepolia.id;
  const network: NetworkInfo = {
    chainId,
    name: supported ? "Sepolia" : "Unsupported network",
    supported,
  };

  return {
    connected: isConnected,
    connecting: isPending,
    address: (address ?? null) as Address | null,
    network,
    connect: () => connect({ connector: injected() }),
    disconnect: () => disconnect(),
    switchToSepolia: () => switchChain({ chainId: sepolia.id }),
  };
}
