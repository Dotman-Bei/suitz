"use client";

import { useMemo, useState } from "react";
import { useReadContracts, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { formatUnits, parseUnits } from "viem";
import { resolvePairs } from "@/lib/registry";
import { ERC20_ABI } from "@/lib/abis";
import { wagmiConfig } from "@/lib/wagmi";
import type { WrapperPair } from "@/lib/types";
import { useStore } from "@/components/providers/AppStore";
import { useWallet } from "@/components/providers/WalletProvider";
import { TokenGlyph } from "@/components/ui/TokenGlyph";
import { AddressTag } from "@/components/ui/AddressTag";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Check, ArrowRight } from "@/components/ui/Icons";

/** Human claim amount per token (scaled by decimals at call time). */
function faucetAmount(symbol: string): number {
  const map: Record<string, number> = { WETH: 2, XAUt: 1, BRON: 1000 };
  return map[symbol] ?? 1000;
}

function fmtBal(raw: bigint | undefined, decimals: number): string {
  if (raw === undefined) return "0";
  const n = Number(formatUnits(raw, decimals));
  return n.toLocaleString("en-US", { maximumFractionDigits: n > 0 && n < 1 ? 6 : 2 });
}

function humanError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/reject|denied|user/i.test(msg)) return "Request rejected.";
  if (/insufficient funds/i.test(msg)) return "Need Sepolia ETH for gas.";
  return "Mint failed — try again.";
}

type ClaimState = "idle" | "claiming" | "claimed";

export function FaucetView() {
  const { connected, address, network, switchToSepolia } = useWallet();
  const store = useStore();
  const official = useMemo(() => resolvePairs().filter((p) => p.source === "official"), []);
  const { writeContractAsync } = useWriteContract();

  const [states, setStates] = useState<Record<string, ClaimState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: balances, refetch } = useReadContracts({
    allowFailure: true,
    contracts: official.map((p) => ({
      address: p.underlying.address,
      abi: ERC20_ABI,
      functionName: "balanceOf" as const,
      args: [address ?? "0x0000000000000000000000000000000000000000"] as const,
    })),
    query: { enabled: Boolean(address) },
  });

  async function claim(pair: WrapperPair) {
    if (!address) return;
    const sym = pair.underlying.symbol;
    setStates((s) => ({ ...s, [sym]: "claiming" }));
    setErrors((e) => ({ ...e, [sym]: "" }));
    try {
      const amount = parseUnits(String(faucetAmount(sym)), pair.underlying.decimals);
      const hash = await writeContractAsync({
        address: pair.underlying.address,
        abi: ERC20_ABI,
        functionName: "mint",
        args: [address, amount],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      await refetch();
      setStates((s) => ({ ...s, [sym]: "claimed" }));
      setTimeout(() => setStates((s) => ({ ...s, [sym]: "idle" })), 2500);
    } catch (e) {
      setStates((s) => ({ ...s, [sym]: "idle" }));
      setErrors((er) => ({ ...er, [sym]: humanError(e) }));
    }
  }

  const wrongNetwork = connected && !network.supported;

  return (
    <div className="p-5 sm:p-8">
      <header className="section-head">
        <span className="section-index">04</span>
        <h2 className="text-xl font-semibold tracking-tight">Faucet</h2>
      </header>

      <p className="mt-5 max-w-2xl text-ink-600">
        Mint the official test tokens listed in the Sepolia Wrappers Registry, then head to the Wrap
        tab. These are the canonical mocks, using them keeps the ecosystem from fragmenting.
      </p>

      {!connected ? (
        <div className="mt-6 panel flex flex-col items-center gap-3 py-16 text-center">
          <div className="logo-mark h-12 w-12 bg-ink-900 text-xl text-paper">s</div>
          <h3 className="text-lg font-semibold">Connect a wallet to claim</h3>
          <p className="max-w-sm text-sm text-ink-500">Tokens are minted to the connected address on Sepolia.</p>
        </div>
      ) : (
        <>
          {wrongNetwork && (
            <div className="mt-6">
              <Alert
                tone="error"
                title="Wrong network"
                action={
                  <Button size="sm" variant="outline" onClick={switchToSepolia}>
                    Switch to Sepolia
                  </Button>
                }
              >
                Minting happens on Sepolia.
              </Alert>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {official.map((p, i) => {
              const sym = p.underlying.symbol;
              const st = states[sym] ?? "idle";
              const raw = balances?.[i]?.result as bigint | undefined;
              const hasBalance = raw !== undefined && raw > 0n;
              return (
                <div key={p.id} className="card flex flex-col p-5 transition hover:border-line-strong">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <TokenGlyph symbol={sym} size={40} />
                      <div>
                        <div className="font-medium">{sym}</div>
                        <div className="text-xs text-ink-400">{p.underlying.name}</div>
                      </div>
                    </div>
                    <span className="badge badge-muted">
                      +{faucetAmount(sym).toLocaleString("en-US")}
                    </span>
                  </div>

                  <div className="mt-5 flex items-baseline justify-between">
                    <span className="mono-label">Balance</span>
                    <span className="font-mono text-sm tabular text-ink-700">
                      {fmtBal(raw, p.underlying.decimals)}
                    </span>
                  </div>

                  <div className="mt-2">
                    <AddressTag address={p.underlying.address} />
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <Button
                      className="flex-1"
                      variant={st === "claimed" ? "outline" : "primary"}
                      loading={st === "claiming"}
                      onClick={() => claim(p)}
                      disabled={st === "claiming" || wrongNetwork}
                    >
                      {st === "claimed" ? (
                        <>
                          <Check width={15} height={15} /> Minted
                        </>
                      ) : st === "claiming" ? (
                        "Minting…"
                      ) : hasBalance ? (
                        "Mint more"
                      ) : (
                        `Mint ${sym}`
                      )}
                    </Button>
                    {hasBalance && (
                      <Button variant="ghost" size="sm" onClick={() => store.goWrap(p.id)} aria-label={`Wrap ${sym}`}>
                        Wrap <ArrowRight width={14} height={14} />
                      </Button>
                    )}
                  </div>

                  {errors[sym] && <p className="mt-2 text-xs text-signal-error">{errors[sym]}</p>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-ink-400">
        Each claim mints test tokens straight to your wallet. You&apos;ll need a little Sepolia ETH
        for gas —{" "}
        <a
          href="https://www.alchemy.com/faucets/ethereum-sepolia"
          target="_blank"
          rel="noreferrer"
          className="text-ink-700 underline-offset-2 hover:underline"
        >
          grab some here
        </a>
        .
      </p>
    </div>
  );
}
