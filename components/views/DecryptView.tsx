"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { formatUnits } from "viem";
import { usePairs, EMPTY_PAIRS } from "@/lib/usePairs";
import { WRAPPER_ABI } from "@/lib/abis";
import { publicClient } from "@/lib/viemClient";
import { userDecryptHandle, ZERO_HANDLE, humanDecryptError } from "@/lib/fheDecrypt";
import type { ConfidentialBalance, WrapperPair } from "@/lib/types";
import { useStore } from "@/components/providers/AppStore";
import { useWallet } from "@/components/providers/WalletProvider";
import { EncryptedValue } from "@/components/ui/EncryptedValue";
import { AddressTag } from "@/components/ui/AddressTag";
import { TokenGlyph } from "@/components/ui/TokenGlyph";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Search, Key, Spinner } from "@/components/ui/Icons";
import { isAddressLike } from "@/lib/format";

// a non-ERC-7984 address — proves the interface-probe error path
const BAD_DEMO = "0x000000000000000000000000000000000000dEaD";

export function DecryptView() {
  const { data: pairs = EMPTY_PAIRS } = usePairs();
  const { connected, address: userAddress } = useWallet();
  const store = useStore();

  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState<ConfidentialBalance | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState(6);
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [notErc7984, setNotErc7984] = useState(false);
  const [loading, setLoading] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  useEffect(() => {
    if (store.decryptTarget) setAddress(store.decryptTarget);
  }, [store.decryptTarget]);

  const valid = isAddressLike(address);
  const registryMatch = useMemo(
    () => pairs.find((p) => p.confidential.address.toLowerCase() === address.toLowerCase()),
    [address, pairs],
  );
  const inRegistry = Boolean(registryMatch);
  const displaySymbol = tokenSymbol || registryMatch?.confidential.symbol || "ERC-7984";

  // auto-detect: scan registry pairs for a non-zero confidential balance onchain
  const [detected, setDetected] = useState<WrapperPair[]>([]);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (!userAddress) {
      setDetected([]);
      return;
    }
    // Keep-alive: this view stays mounted across tab switches, so re-scan each
    // time it becomes active (picks up tokens wrapped since the last visit).
    if (store.tab !== "decrypt") return;
    let alive = true;
    setDetecting(true);
    (async () => {
      const hits = await Promise.all(
        pairs.map(async (p) => {
          try {
            const handle = await publicClient.readContract({
              address: p.confidential.address as `0x${string}`,
              abi: WRAPPER_ABI,
              functionName: "confidentialBalanceOf",
              args: [userAddress],
            });
            return ZERO_HANDLE.test(handle as string) ? null : p;
          } catch {
            return null; // not reachable / not an ERC-7984 — skip it
          }
        }),
      );
      if (!alive) return;
      setDetected(hits.filter((p): p is WrapperPair => Boolean(p)));
      setDetecting(false);
    })();
    return () => {
      alive = false;
    };
  }, [userAddress, pairs, store.tab]);

  // read the real encrypted balance handle + token metadata
  useEffect(() => {
    let alive = true;
    setDecryptError(null);
    if (!valid || !userAddress) {
      setBalance(null);
      setNotErc7984(false);
      return;
    }
    setLoading(true);
    setNotErc7984(false);
    setBalance(null);
    (async () => {
      try {
        const token = address as `0x${string}`;
        const [handle, decimals, symbol] = await Promise.all([
          publicClient.readContract({ address: token, abi: WRAPPER_ABI, functionName: "confidentialBalanceOf", args: [userAddress] }),
          publicClient.readContract({ address: token, abi: WRAPPER_ABI, functionName: "decimals" }).catch(() => 6),
          publicClient.readContract({ address: token, abi: WRAPPER_ABI, functionName: "symbol" }).catch(() => ""),
        ]);
        if (!alive) return;
        setTokenDecimals(Number(decimals));
        setTokenSymbol(String(symbol));
        setBalance({ handle: handle as string, state: "encrypted" });
      } catch {
        if (alive) setNotErc7984(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [address, valid, userAddress]);

  async function decrypt() {
    if (!balance || !userAddress) return;
    const token = address as `0x${string}`;
    const handle = balance.handle as `0x${string}`;

    if (ZERO_HANDLE.test(handle)) {
      setBalance({ handle, state: "revealed", revealed: "0" });
      return;
    }

    setDecryptError(null);
    setBalance({ ...balance, state: "decrypting" });
    try {
      const raw = await userDecryptHandle(token, handle, userAddress);
      const value = formatUnits(raw, tokenDecimals);
      setBalance({ handle, state: "revealed", revealed: value });

      if (registryMatch) store.setConfReveal(registryMatch.confidential.symbol, "revealed", value);
    } catch (e) {
      setBalance({ handle, state: "encrypted" });
      setDecryptError(humanDecryptError(e));
    }
  }

  return (
    <div className="p-5 sm:p-8">
      <header className="section-head">
        <span className="section-index">03</span>
        <h2 className="text-xl font-semibold tracking-tight">Decrypt Any</h2>
        <span className="ml-auto mono-label"></span>
      </header>

      <p className="mt-5 max-w-2xl text-ink-600">
        Read the connected wallet&apos;s balance on <strong>any</strong> ERC-7984 token, registered
        or not. Paste an address or pick one below. The value is re-encrypted to you and decrypted
        locally after a single EIP-712 signature; suitz never sees it.
      </p>

      {!connected ? (
        <div className="mt-6 panel flex flex-col items-center gap-3 py-16 text-center">
          <div className="logo-mark h-12 w-12 bg-ink-900 text-xl text-paper">s</div>
          <h3 className="text-lg font-semibold">Connect a wallet to decrypt</h3>
          <p className="max-w-sm text-sm text-ink-500">
            User decryption is scoped to the connected wallet and requires its signature.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="panel">
            <label className="field-label" htmlFor="erc7984">
              ERC-7984 token address
            </label>
            <div className="input-shell">
              <span className="flex items-center pl-3 text-ink-300">
                <Search width={16} height={16} />
              </span>
              <input
                id="erc7984"
                className="input"
                placeholder="0x… any confidential token"
                value={address}
                onChange={(e) => setAddress(e.target.value.trim())}
                spellCheck={false}
              />
            </div>
            {address && !valid && (
              <p className="mt-2 text-xs text-signal-error">That doesn&apos;t look like an address.</p>
            )}

            {/* auto-detect: wallet holdings vs. examples */}
            <div className="mt-5 space-y-4">
              <div>
                <span className="mono-label">Detected in your wallet</span>
                {detecting ? (
                  <p className="mt-2 flex items-center gap-2 text-xs text-ink-400">
                    <Spinner width={13} height={13} /> scanning your wallet…
                  </p>
                ) : detected.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detected.map((p) => (
                      <Chip
                        key={p.confidential.symbol}
                        symbol={p.confidential.symbol}
                        glyph={<TokenGlyph symbol={p.confidential.symbol} confidential size={16} />}
                        onClick={() => setAddress(p.confidential.address)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-ink-400">
                    No confidential balances yet. Wrap a token, or paste any ERC-7984 address above.
                  </p>
                )}
              </div>

              <div>
                <span className="mono-label">Try an example</span>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Chip symbol="0x…dEaD" hint="not an ERC-7984" muted onClick={() => setAddress(BAD_DEMO)} />
                  <span className="text-2xs text-ink-400">or paste any ERC-7984 address above</span>
                </div>
              </div>
            </div>

            {/* states */}
            {valid && loading && (
              <div className="mt-6 flex items-center gap-2 text-sm text-ink-500">
                <Spinner width={15} height={15} /> reading encrypted balance…
              </div>
            )}

            {valid && notErc7984 && (
              <div className="mt-6">
                <Alert tone="error" title="Not an ERC-7984 token">
                  This address doesn&apos;t expose <code className="font-mono">confidentialBalanceOf</code>.
                  Double-check it&apos;s a confidential token on Sepolia.
                </Alert>
              </div>
            )}

            {valid && !notErc7984 && balance && (
              <div className="mt-6 rounded-md border border-line bg-paper-raised p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <TokenGlyph symbol={displaySymbol} confidential size={30} />
                    <div>
                      <div className="text-sm font-medium">{displaySymbol}</div>
                      <div className="text-2xs text-ink-400">{inRegistry ? "in registry" : "outside registry"}</div>
                    </div>
                  </div>
                  <AddressTag address={address} />
                </div>
                <div className="my-4 rule" />
                <span className="mono-label">Your balance</span>
                <div className="mt-3">
                  <EncryptedValue
                    balance={balance}
                    symbol={displaySymbol}
                    size="lg"
                    onDecrypt={decrypt}
                    decryptLabel="Decrypt with EIP-712"
                  />
                </div>
                {decryptError && <p className="mt-3 text-sm text-signal-error">{decryptError}</p>}
                {balance.state === "revealed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 px-0"
                    onClick={() => setBalance({ ...balance, state: "encrypted", revealed: undefined })}
                  >
                    Re-encrypt view
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* how it works */}
          <aside className="panel self-start">
            <h3 className="mono-label">How user decryption works</h3>
            <ol className="mt-4 space-y-4 text-sm text-ink-600">
              <Numbered n={1}>Read the ciphertext handle from <code className="font-mono text-ink-900">confidentialBalanceOf(you)</code>.</Numbered>
              <Numbered n={2}>The relayer SDK builds a keypair + EIP-712 typed-data grant.</Numbered>
              <Numbered n={3}>You sign once, no gas, no transaction.</Numbered>
              <Numbered n={4}>The value is re-encrypted to your key and decrypted in your browser.</Numbered>
            </ol>
            <div className="mt-5 rounded-sm border border-line bg-paper-sunken p-3">
              <p className="flex items-start gap-2 text-xs text-ink-500">
                <Key width={14} height={14} className="mt-0.5 shrink-0" />
                Works on any ERC-7984. This is how you read confidential assets that were never added
                to the registry.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Chip({
  symbol,
  hint,
  muted,
  glyph,
  onClick,
}: {
  symbol: string;
  hint?: string;
  muted?: boolean;
  glyph?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-xs transition " +
        (muted
          ? "border-dashed border-line-strong text-ink-400 hover:text-ink-700"
          : "border-line-strong text-ink-700 hover:border-ink-900")
      }
    >
      {glyph}
      <span className="font-mono">{symbol}</span>
      {hint && <span className="text-2xs text-ink-400">{hint}</span>}
    </button>
  );
}

function Numbered({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-2xs text-ink-500">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
