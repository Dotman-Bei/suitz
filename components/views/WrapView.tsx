"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { bytesToHex, decodeEventLog, formatUnits, parseUnits, type Log } from "viem";
import { usePairs, EMPTY_PAIRS } from "@/lib/usePairs";
import { ERC20_ABI, WRAPPER_ABI } from "@/lib/abis";
import { wagmiConfig } from "@/lib/wagmi";
import { publicClient } from "@/lib/viemClient";
import { getFhevm } from "@/lib/fhevm";
import { getConfidentialDecimals } from "@/lib/confidential";
import { userDecryptHandle, publicDecryptHandle } from "@/lib/fheDecrypt";
import type { FlowStage, WrapperPair } from "@/lib/types";
import { useStore } from "@/components/providers/AppStore";
import { useWallet } from "@/components/providers/WalletProvider";
import { TokenGlyph } from "@/components/ui/TokenGlyph";
import { AddressTag } from "@/components/ui/AddressTag";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ChevronDown, Swap, ArrowRight, Check, Key, ExternalLink, Spinner } from "@/components/ui/Icons";
import { groupNumber, txExplorer } from "@/lib/format";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;
type Mode = "wrap" | "unwrap";

function humanError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/reject|denied|user/i.test(msg)) return "Request rejected in wallet.";
  if (/insufficient funds/i.test(msg)) return "Need Sepolia ETH for gas.";
  if (/exceeds balance|transfer amount exceeds/i.test(msg)) return "Insufficient token balance.";
  if (/out of range|overflow|must be less than|too large/i.test(msg)) return "Amount is too large for this token.";
  return "Transaction failed, try again.";
}

const toHex = (v: Uint8Array | string): `0x${string}` =>
  typeof v === "string" ? (v.startsWith("0x") ? (v as `0x${string}`) : (`0x${v}` as `0x${string}`)) : bytesToHex(v);

/**
 * Pull the euint64 handle the wrapper queued for decryption out of the unwrap
 * receipt. finalizeUnwrap needs it to fetch the cleartext + KMS proof and
 * release the ERC-20.
 */
function extractUnwrapHandle(logs: Log[], wrapper: `0x${string}`): `0x${string}` | null {
  const w = wrapper.toLowerCase();
  for (const log of logs) {
    if (log.address.toLowerCase() !== w) continue;
    try {
      const ev = decodeEventLog({ abi: WRAPPER_ABI, data: log.data, topics: log.topics });
      if (ev.eventName === "UnwrapRequested") {
        const args = ev.args as { handle?: `0x${string}`; requestId?: `0x${string}` };
        return args.handle ?? args.requestId ?? null;
      }
    } catch {
      /* not the UnwrapRequested event — skip */
    }
  }
  return null;
}

export function WrapView() {
  const { data: pairs = EMPTY_PAIRS } = usePairs();
  const { connected, network, address } = useWallet();
  const store = useStore();

  const selected =
    pairs.find((p) => p.id === store.selectedPairId) ?? pairs[0];

  const [mode, setMode] = useState<Mode>("wrap");
  const [amount, setAmount] = useState("");
  const [approved, setApproved] = useState(false);
  const [stage, setStage] = useState<FlowStage>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [finalizePending, setFinalizePending] = useState(false);
  // handle of a burned-but-not-yet-released unwrap, so a failed finalize can be
  // retried (the ERC-7984 is already burned — the ERC-20 is still claimable).
  const [pendingHandle, setPendingHandle] = useState<`0x${string}` | null>(null);
  const busyRef = useRef(false);

  // inline (in-tab) decryption of the confidential balance, for the unwrap side
  const [decrypting, setDecrypting] = useState(false);
  const [confDecimals, setConfDecimals] = useState<number | null>(null);

  const underlyingAddr = selected?.underlying.address;
  const wrapperAddr = selected?.confidential.address;

  // the wrapper's real (uint64-safe) decimals — for the unwrap amount + display
  useEffect(() => {
    if (!wrapperAddr) return;
    let alive = true;
    getConfidentialDecimals(wrapperAddr)
      .then((d) => alive && setConfDecimals(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [wrapperAddr]);

  // Warm up the FHEVM SDK (WASM + key material) ahead of time so the first
  // unwrap doesn't pay init cost on top of the proof generation.
  useEffect(() => {
    if (connected) void getFhevm().catch(() => {});
  }, [connected]);

  // live ERC-20 balance + allowance for the selected pair (wrap side)
  const { data: erc20Raw, refetch: refetchBal } = useReadContract({
    address: underlyingAddr,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address ?? ZERO_ADDR],
    query: { enabled: Boolean(address && underlyingAddr) },
  });
  const { data: allowanceRaw, refetch: refetchAllow } = useReadContract({
    address: underlyingAddr,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? ZERO_ADDR, wrapperAddr ?? ZERO_ADDR],
    query: { enabled: Boolean(address && underlyingAddr && wrapperAddr) },
  });
  const { writeContractAsync } = useWriteContract();

  // reset the flow whenever the inputs change
  useEffect(() => {
    setApproved(false);
    setStage("idle");
    setTxHash(null);
    setErrorMsg(null);
  }, [mode, amount, selected?.id]);

  // A pending unwrap belongs to one wrapper — drop it when the pair or direction
  // changes (but NOT when only the amount is edited, so the claim survives edits).
  useEffect(() => {
    setPendingHandle(null);
    setFinalizePending(false);
  }, [mode, selected?.id]);

  if (!selected) return null;

  const { underlying, confidential } = selected;
  const confBal = store.conf[confidential.symbol];
  const erc20Bal =
    erc20Raw !== undefined ? Number(formatUnits(erc20Raw as bigint, underlying.decimals)) : 0;

  const sourceSym = mode === "wrap" ? underlying.symbol : confidential.symbol;
  const targetSym = mode === "wrap" ? confidential.symbol : underlying.symbol;

  const amt = parseFloat(amount || "0");
  const wrongNetwork = connected && !network.supported;

  // unwrap max is only known once the confidential balance is decrypted
  const unwrapKnownMax = confBal?.state === "revealed" ? confBal.amount : null;
  const insufficient =
    mode === "wrap"
      ? amt > erc20Bal
      : unwrapKnownMax !== null && amt > unwrapKnownMax;

  const noFunds = mode === "wrap" ? erc20Bal <= 0 : (confBal?.amount ?? 0) <= 0;
  const settled = stage === "settled";
  const busy = ["approving", "wrapping", "encrypting", "submitting", "finalizing"].includes(stage);

  async function runWrap() {
    if (busyRef.current || !address || !wrapperAddr) return;
    busyRef.current = true;
    setErrorMsg(null);
    try {
      const amountBase = parseUnits(amount || "0", underlying.decimals);
      const currentAllowance = (allowanceRaw as bigint | undefined) ?? 0n;

      // step 1 — approve the wrapper to pull the ERC-20 (skip if already allowed)
      if (currentAllowance < amountBase) {
        setStage("approving");
        const approveHash = await writeContractAsync({
          address: underlying.address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [wrapperAddr, amountBase],
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
        await refetchAllow();
      }
      setApproved(true);

      // step 2 — wrap (plaintext amount → mints an encrypted ERC-7984 balance)
      setStage("wrapping");
      const wrapHash = await writeContractAsync({
        address: wrapperAddr,
        abi: WRAPPER_ABI,
        functionName: "wrap",
        args: [address, amountBase],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: wrapHash });
      setTxHash(wrapHash);
      await refetchBal();

      // Track the new confidential balance optimistically so the Unwrap tab knows
      // funds exist and prompts a decrypt. The true value is always read + decrypted
      // fresh from chain (decryptConfidential / Decrypt tab) before it gates an unwrap.
      store.addConf(confidential.symbol, amt);
      setStage("settled");
    } catch (e) {
      setErrorMsg(humanError(e));
      setStage("error");
    } finally {
      busyRef.current = false;
    }
  }

  /**
   * Step 2 of unwrap: turn a queued decryption `handle` into the released
   * ERC-20. Public-decrypts the amount + KMS proof from the relayer, then calls
   * finalizeUnwrap. Split out so it can be retried on its own — once the ERC-7984
   * is burned the ERC-20 stays claimable, so a failure here must never strand it.
   */
  async function finalizeUnwrap(reqHandle: `0x${string}`, wrapper: `0x${string}`, dec: number) {
    setStage("finalizing");
    setPendingHandle(reqHandle);
    // fetch cleartext amount + KMS signatures (retries until the coprocessor is ready)
    const { amount: clearAmount, proof } = await publicDecryptHandle(reqHandle);
    const finalizeHash = await writeContractAsync({
      address: wrapper,
      abi: WRAPPER_ABI,
      functionName: "finalizeUnwrap",
      args: [reqHandle, clearAmount, proof],
    });
    await waitForTransactionReceipt(wagmiConfig, { hash: finalizeHash });
    setTxHash(finalizeHash);
    await refetchBal();
    store.subConf(confidential.symbol, Number(formatUnits(clearAmount, dec)));
    setPendingHandle(null);
    setFinalizePending(false);
    setStage("settled");
  }

  async function runUnwrap() {
    if (busyRef.current || !address || !wrapperAddr) return;
    busyRef.current = true;
    setErrorMsg(null);
    setFinalizePending(false);
    // true once the ERC-7984 is burned — from here a failure is a claimable
    // pending unwrap, not a lost one (state reads in catch would be stale).
    let burned = false;
    try {
      setStage("encrypting");
      // Yield a frame so the "Encrypting…" step actually paints before the proof
      // generation locks the main thread (otherwise the page looks frozen).
      await new Promise((r) => setTimeout(r, 30));

      // Confidential balances are euint64, so the wrapper exposes its OWN decimals
      // (capped so amounts fit 64 bits) — distinct from the underlying's. The
      // registry seeds confidential.decimals from the underlying, which overflows
      // uint64 for 18-decimal tokens and makes add64() throw. Use the real value.
      const dec = confDecimals ?? (await getConfidentialDecimals(wrapperAddr));
      const amountBase = parseUnits(amount || "0", dec);

      // 1 — encrypt the unwrap amount client-side (relayer SDK)
      const instance = await getFhevm();
      const input = instance.createEncryptedInput(wrapperAddr, address);
      input.add64(amountBase);
      const enc = await input.encrypt();
      const encHandle = toHex(enc.handles[0]);
      const proof = toHex(enc.inputProof);

      // 2 — submit unwrap: burns the ERC-7984 and queues the amount for decryption
      setStage("submitting");
      const hash = await writeContractAsync({
        address: wrapperAddr,
        abi: WRAPPER_ABI,
        functionName: "unwrap",
        args: [address, address, encHandle, proof],
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      setTxHash(hash);
      burned = true;

      // 3 — finalize: fetch the public decryption + proof and release the ERC-20.
      // This second tx is what the old flow was missing — without it the burned
      // balance never converts back and the ERC-20 never arrives.
      const reqHandle = extractUnwrapHandle(receipt.logs as Log[], wrapperAddr);
      if (!reqHandle) throw new Error("Unwrap request handle not found in logs");
      await finalizeUnwrap(reqHandle, wrapperAddr, dec);
    } catch (e) {
      setErrorMsg(humanError(e));
      setFinalizePending(burned);
      setStage("error");
    } finally {
      busyRef.current = false;
    }
  }

  /** Retry just the finalize (claim) step for an already-burned unwrap. */
  async function runClaim() {
    if (busyRef.current || !wrapperAddr || !pendingHandle) return;
    busyRef.current = true;
    setErrorMsg(null);
    try {
      const dec = confDecimals ?? (await getConfidentialDecimals(wrapperAddr));
      await finalizeUnwrap(pendingHandle, wrapperAddr, dec);
    } catch (e) {
      setErrorMsg(humanError(e));
      setFinalizePending(true);
      setStage("error");
    } finally {
      busyRef.current = false;
    }
  }

  // Inline decrypt — reveal the confidential balance without leaving the Unwrap
  // tab. Same EIP-712 flow as the Decrypt tab; result lands in the store so the
  // unwrap max / insufficient checks unlock immediately.
  async function decryptConfidential() {
    if (!address || decrypting) return;
    setDecrypting(true);
    try {
      const token = confidential.address;
      const handle = (await publicClient.readContract({
        address: token,
        abi: WRAPPER_ABI,
        functionName: "confidentialBalanceOf",
        args: [address],
      })) as `0x${string}`;
      const dec = confDecimals ?? (await getConfidentialDecimals(token));
      const raw = await userDecryptHandle(token, handle, address);
      store.setConfReveal(confidential.symbol, "revealed", formatUnits(raw, dec));
    } catch {
      /* non-fatal: the spinner clears in finally; user can retry from the balance row */
    } finally {
      setDecrypting(false);
    }
  }

  return (
    <div className="p-5 sm:p-8">
      <header className="section-head">
        <span className="section-index">02</span>
        <h2 className="text-xl font-semibold tracking-tight">Wrap / Unwrap</h2>
        <span className="ml-auto mono-label">{selected.source} pair</span>
      </header>

      {!connected ? (
        <ConnectGate />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* ---- conversion card ---- */}
          <div className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PairSelect pairs={pairs} selected={selected} onSelect={store.selectPair} />
              <DirectionToggle mode={mode} onToggle={() => setMode((m) => (m === "wrap" ? "unwrap" : "wrap"))} />
            </div>

            {wrongNetwork && (
              <div className="mt-5">
                <Alert tone="error" title="Wrong network">
                  Switch to Sepolia to wrap or unwrap.
                </Alert>
              </div>
            )}

            {/* from */}
            <motion.div
              key={`from-${mode}`}
              initial={{ opacity: 0, x: mode === "wrap" ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}
              className="mt-5"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="field-label mb-0">You {mode === "wrap" ? "wrap" : "unwrap"}</span>
                <BalanceLabel
                  mode={mode}
                  erc20={erc20Bal}
                  conf={confBal}
                  decrypting={decrypting}
                  onMax={() => {
                    if (mode === "wrap") setAmount(String(erc20Bal));
                    else if (unwrapKnownMax !== null) setAmount(String(unwrapKnownMax));
                  }}
                  onDecrypt={decryptConfidential}
                />
              </div>
              <div className="input-shell">
                <input
                  className="input text-lg"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                />
                <span className="flex items-center gap-2 border-l border-line px-3.5">
                  <TokenGlyph symbol={sourceSym} confidential={mode === "unwrap"} size={24} />
                  <span className="font-mono text-sm">{sourceSym}</span>
                </span>
              </div>
            </motion.div>

            {/* arrow */}
            <div className="my-3 flex items-center justify-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper-raised text-ink-500">
                <motion.span
                  className="flex"
                  animate={{ rotate: mode === "wrap" ? 90 : 270 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                >
                  <ArrowRight width={15} height={15} />
                </motion.span>
              </span>
            </div>

            {/* to */}
            <motion.div
              key={`to-${mode}`}
              initial={{ opacity: 0, x: mode === "wrap" ? 12 : -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <span className="field-label">You receive</span>
              <div className="flex items-center justify-between rounded-sm border border-line bg-paper-sunken px-3.5 py-3.5">
                <span className="font-mono text-lg text-ink-700">{amount || "0.0"}</span>
                <span className="flex items-center gap-2">
                  <TokenGlyph symbol={targetSym} confidential={mode === "wrap"} size={24} />
                  <span className="font-mono text-sm">{targetSym}</span>
                </span>
              </div>
              {mode === "wrap" && (
                <p className="mt-2 text-xs text-ink-400">
                  Your {confidential.symbol} balance is encrypted on receipt, you decrypt it from the
                  Decrypt tab.
                </p>
              )}
            </motion.div>

            {/* validation */}
            {amt > 0 && insufficient && (
              <div className="mt-4">
                <Alert tone="error" title="Insufficient balance">
                  {mode === "wrap"
                    ? `You only hold ${groupNumber(String(erc20Bal))} ${underlying.symbol}. Claim more from the faucet.`
                    : `Amount exceeds your decrypted ${confidential.symbol} balance.`}
                </Alert>
              </div>
            )}
            {mode === "wrap" && noFunds && (
              <div className="mt-4">
                <Alert
                  tone="info"
                  title={`No ${underlying.symbol} yet`}
                  action={
                    <Button size="sm" variant="outline" onClick={() => store.setTab("faucet")}>
                      Open faucet
                    </Button>
                  }
                >
                  Claim test {underlying.symbol} to try the wrap flow.
                </Alert>
              </div>
            )}
            {/* error — suppressed when a claim is pending (the claim alert covers it) */}
            {stage === "error" && errorMsg && !finalizePending && (
              <div className="mt-4">
                <Alert tone="error" title={mode === "wrap" ? "Wrap failed" : "Unwrap failed"}>
                  {errorMsg}
                </Alert>
              </div>
            )}

            {/* stepper */}
            {(busy || settled) && (
              <div className="mt-6 rounded-md border border-line bg-paper-raised p-4">
                <FlowStepper mode={mode} stage={stage} approved={approved} />
              </div>
            )}

            {/* burned but not yet released — offer to (re)claim */}
            {finalizePending && (
              <div className="mt-6 space-y-3">
                <Alert tone="info" title="Unwrap burned, claim pending">
                  Your {confidential.symbol} was burned but the {underlying.symbol} release
                  (finalizeUnwrap) didn&apos;t complete. Your funds are safe and still claimable;
                  retry to fetch the decryption proof and release them.
                </Alert>
                <Button
                  className="w-full"
                  size="lg"
                  loading={stage === "finalizing"}
                  disabled={wrongNetwork || !pendingHandle}
                  onClick={runClaim}
                >
                  {stage === "finalizing" ? "Claiming…" : `Claim ${underlying.symbol}`}
                </Button>
              </div>
            )}

            {/* result */}
            {settled && txHash && (
              <ResultPanel
                mode={mode}
                targetSym={targetSym}
                amount={amount}
                txHash={txHash}
                onDecrypt={() => store.goDecrypt(confidential.address)}
              />
            )}

            {/* primary action */}
            {!settled && !finalizePending && (
              <div className="mt-6">
                <PrimaryAction
                  mode={mode}
                  approved={approved}
                  stage={stage}
                  disabled={wrongNetwork || noFunds || amt <= 0 || insufficient || (mode === "unwrap" && unwrapKnownMax === null)}
                  sourceSym={sourceSym}
                  amount={amount}
                  onRun={mode === "wrap" ? runWrap : runUnwrap}
                />
              </div>
            )}
          </div>

          {/* ---- summary panel ---- */}
          <SummaryPanel pair={selected} mode={mode} confDecimals={confDecimals} />
        </div>
      )}
    </div>
  );
}

/* ----------------------------- sub-components ----------------------------- */

function ConnectGate() {
  return (
    <div className="mt-6 panel flex flex-col items-center gap-3 py-16 text-center">
      <div className="logo-mark h-12 w-12 bg-ink-900 text-xl text-paper">s</div>
      <h3 className="text-lg font-semibold">Connect a wallet to convert</h3>
      <p className="max-w-sm text-sm text-ink-500">
        Wrapping and unwrapping happen onchain on Sepolia. Connect a wallet to load your balances and
        sign transactions.
      </p>
    </div>
  );
}

function PairSelect({
  pairs,
  selected,
  onSelect,
}: {
  pairs: WrapperPair[];
  selected: WrapperPair;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="btn btn-outline gap-2.5" onClick={() => setOpen((v) => !v)}>
        <TokenGlyph symbol={selected.confidential.symbol} confidential size={22} />
        <span className="font-medium">
          {selected.underlying.symbol} / {selected.confidential.symbol}
        </span>
        <ChevronDown width={15} height={15} className="text-ink-400" />
      </button>
      {open && (
        <div className="glass absolute z-50 mt-2 max-h-80 w-72 animate-fade-up overflow-auto rounded-md p-1.5">
          {pairs.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left hover:bg-ink-100"
            >
              <TokenGlyph symbol={p.confidential.symbol} confidential size={26} />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {p.underlying.symbol} / {p.confidential.symbol}
                </div>
                <div className="text-2xs text-ink-400">{p.confidential.name}</div>
              </div>
              {p.id === selected.id && <Check width={15} height={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DirectionToggle({ mode, onToggle }: { mode: Mode; onToggle: () => void }) {
  const options: { id: Mode; label: string }[] = [
    { id: "wrap", label: "Wrap" },
    { id: "unwrap", label: "Unwrap" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Conversion direction"
      className="inline-flex items-center gap-1 rounded-full border border-line bg-paper-sunken p-1 text-sm"
    >
      {options.map((o) => {
        const active = mode === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) onToggle();
            }}
            className={
              "relative rounded-full px-3.5 py-1.5 font-medium transition-colors " +
              (active ? "text-paper" : "text-ink-500 hover:text-ink-900")
            }
          >
            {active && (
              <motion.span
                layoutId="direction-pill"
                className="absolute inset-0 rounded-full bg-ink-900"
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Swap width={14} height={14} className={o.id === "unwrap" ? "rotate-180" : undefined} />
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BalanceLabel({
  mode,
  erc20,
  conf,
  onMax,
  onDecrypt,
  decrypting,
}: {
  mode: Mode;
  erc20: number;
  conf?: { state: string; amount: number; revealed?: string };
  onMax: () => void;
  onDecrypt: () => void;
  decrypting?: boolean;
}) {
  if (mode === "wrap") {
    return (
      <span className="flex items-center gap-2 text-2xs text-ink-400">
        Balance <span className="font-mono text-ink-700">{groupNumber(String(erc20))}</span>
        <button type="button" onClick={onMax} className="text-ink-900 hover:underline">
          MAX
        </button>
      </span>
    );
  }
  if (conf?.state === "revealed") {
    return (
      <span className="flex items-center gap-2 text-2xs text-ink-400">
        Balance <span className="font-mono text-ink-700">{groupNumber(conf.revealed ?? "0")}</span>
        <button type="button" onClick={onMax} className="text-ink-900 hover:underline">
          MAX
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onDecrypt}
      disabled={decrypting}
      className="flex items-center gap-1 text-2xs text-ink-500 hover:text-ink-900 disabled:opacity-70"
    >
      {decrypting ? (
        <>
          <Spinner width={12} height={12} /> decrypting…
        </>
      ) : (
        <>
          <Key width={12} height={12} /> encrypted · decrypt to view
        </>
      )}
    </button>
  );
}

const WRAP_STEPS = [
  { key: "approve", label: "Approve ERC-20 allowance" },
  { key: "wrap", label: "Wrap → mint ERC-7984" },
];
const UNWRAP_STEPS = [
  { key: "encrypt", label: "Encrypt amount (relayer SDK)" },
  { key: "submit", label: "Submit unwrap (burns ERC-7984)" },
  { key: "finalize", label: "Decrypt proof + finalizeUnwrap" },
  { key: "settle", label: "ERC-20 released" },
];

function FlowStepper({ mode, stage, approved }: { mode: Mode; stage: FlowStage; approved: boolean }) {
  const steps = mode === "wrap" ? WRAP_STEPS : UNWRAP_STEPS;

  function stateFor(key: string): "pending" | "active" | "done" {
    if (mode === "wrap") {
      if (key === "approve") {
        if (stage === "approving") return "active";
        return approved || ["wrapping", "settled"].includes(stage) ? "done" : "pending";
      }
      if (stage === "wrapping") return "active";
      return stage === "settled" ? "done" : "pending";
    }
    const order = ["encrypting", "submitting", "finalizing", "settled"];
    const map: Record<string, number> = { encrypt: 0, submit: 1, finalize: 2, settle: 3 };
    const cur = order.indexOf(stage);
    const idx = map[key];
    if (cur === idx) return "active";
    if (cur > idx || stage === "settled") return "done";
    return "pending";
  }

  return (
    <ol>
      {steps.map((s, i) => {
        const st = stateFor(s.key);
        return (
          <li key={s.key} className="step" data-state={st}>
            <span className="step-dot">{st === "done" ? <Check width={13} height={13} /> : i + 1}</span>
            <span className={"step-label text-sm " + (st === "active" ? "font-medium text-ink-900" : "text-ink-600")}>
              {s.label}
              {st === "active" && s.key === "finalize" && (
                <span className="ml-2 text-2xs text-ink-400">fetching decryption proof…</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PrimaryAction({
  mode,
  approved,
  stage,
  disabled,
  sourceSym,
  amount,
  onRun,
}: {
  mode: Mode;
  approved: boolean;
  stage: FlowStage;
  disabled: boolean;
  sourceSym: string;
  amount: string;
  onRun: () => void;
}) {
  const busy = stage !== "idle" && stage !== "settled";
  let label: string;
  if (mode === "wrap") {
    if (stage === "approving") label = `Approving ${sourceSym}…`;
    else if (stage === "wrapping") label = "Wrapping…";
    else if (!approved) label = `Approve ${sourceSym}`;
    else label = `Wrap ${amount || ""} ${sourceSym}`;
  } else {
    if (stage === "encrypting") label = "Encrypting…";
    else if (stage === "submitting") label = "Submitting…";
    else if (stage === "finalizing") label = "Finalizing onchain…";
    else label = `Unwrap ${amount || ""} ${sourceSym}`;
  }

  return (
    <Button className="w-full" size="lg" loading={busy} disabled={disabled} onClick={onRun}>
      {label}
    </Button>
  );
}

function ResultPanel({
  mode,
  targetSym,
  amount,
  txHash,
  onDecrypt,
}: {
  mode: Mode;
  targetSym: string;
  amount: string;
  txHash: string;
  onDecrypt: () => void;
}) {
  return (
    <div className="mt-6 animate-fade-up rounded-md border border-ink-900 bg-ink-900 p-5 text-paper">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper text-ink-900">
          <Check width={14} height={14} />
        </span>
        <span className="font-medium">
          {mode === "wrap" ? "Wrapped" : "Unwrapped"} {amount} → {targetSym}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={txExplorer(txHash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-ink-200 hover:text-paper"
        >
          View transaction <ExternalLink width={13} height={13} />
        </a>
        {mode === "wrap" && (
          <button
            type="button"
            onClick={onDecrypt}
            className="ml-auto inline-flex items-center gap-1.5 rounded-sm bg-paper px-3 py-1.5 text-sm font-medium text-ink-900"
          >
            <Key width={14} height={14} /> Decrypt new balance
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryPanel({
  pair,
  mode,
  confDecimals,
}: {
  pair: WrapperPair;
  mode: Mode;
  confDecimals?: number | null;
}) {
  return (
    <aside className="space-y-5">
      <div className="panel">
        <h3 className="mono-label">Pair details</h3>
        <dl className="mt-4 space-y-4">
          <Row label="Underlying (ERC-20)">
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-sm">{pair.underlying.symbol}</span>
              <AddressTag address={pair.underlying.address} />
            </div>
          </Row>
          <div className="rule" />
          <Row label="Confidential (ERC-7984)">
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-sm">{pair.confidential.symbol}</span>
              <AddressTag address={pair.confidential.address} />
            </div>
          </Row>
          <div className="rule" />
          <Row label="Decimals">
            <span className="font-mono text-sm">{confDecimals ?? pair.confidential.decimals}</span>
          </Row>
        </dl>
      </div>

      <div className="panel">
        <h3 className="mono-label">{mode === "wrap" ? "What happens on wrap" : "What happens on unwrap"}</h3>
        {mode === "wrap" ? (
          <ol className="mt-4 space-y-3 text-sm text-ink-600">
            <li>1 · Approve the wrapper to spend your ERC-20.</li>
            <li>2 · <code className="font-mono text-ink-900">wrap()</code> pulls the ERC-20 and mints ERC-7984.</li>
            <li>3 · Your new balance arrives encrypted; decrypt it anytime.</li>
          </ol>
        ) : (
          <ol className="mt-4 space-y-3 text-sm text-ink-600">
            <li>1 · The amount is encrypted client-side via the relayer SDK.</li>
            <li>2 · <code className="font-mono text-ink-900">unwrap()</code> burns the ERC-7984 and queues the amount for decryption.</li>
            <li>3 · The relayer publicly decrypts it, returning the value + KMS proof.</li>
            <li>4 · <code className="font-mono text-ink-900">finalizeUnwrap()</code> releases your ERC-20 in a second tx.</li>
          </ol>
        )}
      </div>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
