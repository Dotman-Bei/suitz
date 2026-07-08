import { getZama } from "./fhevm";

/** All-zero handle ⇒ uninitialised balance ⇒ cleartext 0 (no signature needed). */
export const ZERO_HANDLE = /^0x0*$/;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const errText = (e: unknown) =>
  (e instanceof Error ? e.message : String(e)).toLowerCase();

/** Typed-error accessors — every SDK error carries a stable `.code` string. */
const errCode = (e: unknown): string | undefined =>
  typeof e === "object" && e !== null && typeof (e as { code?: unknown }).code === "string"
    ? (e as { code: string }).code
    : undefined;
const errStatus = (e: unknown): number | undefined =>
  typeof e === "object" && e !== null && typeof (e as { statusCode?: unknown }).statusCode === "number"
    ? (e as { statusCode: number }).statusCode
    : undefined;

/**
 * The relayer is a shared, off-chain service in front of the threshold-MPC KMS.
 * The ciphertext for a freshly-produced handle isn't ingested by the coprocessor
 * the instant its tx is mined, so the relayer answers `not_ready_for_decryption`
 * for a few seconds. Detected separately so callers can say "still settling"
 * rather than blaming the relayer.
 */
export function isNotReadyError(e: unknown): boolean {
  return /not_?ready/.test(errText(e));
}

/** Shared public relayer throttling — a burst of decrypts got rate-limited. */
export function isRateLimitedError(e: unknown): boolean {
  if (errStatus(e) === 429) return true;
  return /\b429\b|rate.?limit|too many requests|relayer is busy/.test(errText(e));
}

/**
 * Transient relayer/KMS failures: the handle isn't ingested yet, we were
 * throttled, a worker op timed out or was recycled, or the relayer had a blip.
 * Prefers the SDK's typed `.code`s; falls back to message heuristics for
 * anything that isn't a ZamaError. Excludes wallet/signature rejections.
 */
export function isTransientRelayerError(e: unknown): boolean {
  const code = errCode(e);
  if (code === "OPERATION_TIMEOUT" || code === "WORKER_RECYCLED") return true;
  if (code === "RELAYER_REQUEST_FAILED") {
    const status = errStatus(e);
    return status === undefined || status === 429 || status >= 500;
  }
  if (isNotReadyError(e) || isRateLimitedError(e)) return true;
  return /timeout|timed out|network|fetch failed|\b50[234]\b|gateway|unavailable/.test(
    errText(e),
  );
}

/**
 * Retry policy for client-driven decrypts: retry the errors that resolve on
 * their own (coprocessor ingestion, infra blips, worker recycling) but NOT rate
 * limits — auto-retrying a 429 just extends the throttle window, so those fail
 * fast to the user with a "try again in a moment" message instead.
 */
function isRetryableTransient(e: unknown): boolean {
  return isTransientRelayerError(e) && !isRateLimitedError(e);
}

/**
 * Map a decrypt failure to a user-facing message. Shared by every decrypt entry
 * point (Decrypt tab + the inline reveal in the Unwrap tab) so the wording stays
 * consistent. These surface only *after* the retries are exhausted, so they name
 * the real cause instead of blaming the relayer for a timing race.
 */
export function humanDecryptError(e: unknown): string {
  const code = errCode(e);
  if (code === "SIGNING_REJECTED") return "Signature rejected.";
  if (code === "KEYPAIR_EXPIRED" || code === "INVALID_KEYPAIR")
    return "Your decryption session expired. Try again to sign a fresh permit.";
  if (code === "CONFIGURATION" || code === "ENCRYPTION_FAILED")
    return "The encryption worker failed to start. Hard-refresh the page and try again.";
  if (code === "CHAIN_MISMATCH")
    return "Your wallet is on a different network. Switch to Sepolia and try again.";
  if (
    code === "WALLET_NOT_CONNECTED" ||
    code === "WALLET_ACCOUNT_NOT_READY" ||
    code === "SIGNER_NOT_CONFIGURED" ||
    code === "SIGNER_REQUIRED"
  )
    return "Wallet not connected. Reconnect and try again.";
  if (code === "OPERATION_TIMEOUT" || code === "WORKER_RECYCLED")
    return "The decryption timed out — the network may be slow. Try again.";
  const msg = e instanceof Error ? e.message : String(e);
  if (/reject|denied|signature|user/i.test(msg)) return "Signature rejected.";
  if (isNotReadyError(e))
    return "Balance is still settling on-chain. Give it a few seconds and try again.";
  if (isRateLimitedError(e))
    return "Too many decrypt requests right now. Try again in a moment.";
  if (code === "RELAYER_REQUEST_FAILED")
    return "The relayer couldn’t process the request right now. Try again shortly.";
  return "Couldn’t decrypt, the relayer may be busy. Try again.";
}

/**
 * Retry `fn` on transient relayer failures with a fixed backoff. Non-transient
 * errors (e.g. a rejected signature, a bad handle) throw immediately.
 */
async function withRelayerRetry<T>(
  fn: () => Promise<T>,
  {
    attempts,
    delayMs,
    retryOn = isTransientRelayerError,
  }: { attempts: number; delayMs: number; retryOn?: (e: unknown) => boolean },
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1 && retryOn(e)) {
        await sleep(delayMs);
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Relayer retry exhausted");
}

/**
 * Decrypt a single ERC-7984 ciphertext handle for the connected wallet and
 * return the cleartext as a bigint.
 *
 * Runs through the Zama SDK's decryption pipeline: the first decrypt of a
 * session signs one EIP-712 permit (kept in memory, dies with the tab); every
 * further decrypt that session is **silent** — and decrypted handles are
 * cached, so re-reading an unchanged balance never hits the relayer.
 *
 * Shared by the Decrypt tab and the inline "decrypt to unwrap" affordance so the
 * flow is implemented in exactly one place.
 */
export async function userDecryptHandle(
  token: `0x${string}`,
  handle: `0x${string}`,
  user: `0x${string}`,
  { attempts = 8, delayMs = 3000 }: { attempts?: number; delayMs?: number } = {},
): Promise<bigint> {
  if (!user) throw new Error("Wallet not connected");
  if (ZERO_HANDLE.test(handle)) return 0n;

  const sdk = await getZama();
  try {
    const res = await withRelayerRetry(
      () => sdk.decryption.decryptValues([{ encryptedValue: handle, contractAddress: token }]),
      { attempts, delayMs, retryOn: isRetryableTransient },
    );
    const clear = res[handle];
    if (clear === undefined) throw new Error("Decryption returned no value for this handle");
    return typeof clear === "bigint" ? clear : BigInt(clear as string | number);
  } catch (e) {
    // "No ciphertext" isn't a failure — the account simply never held a balance.
    if (errCode(e) === "NO_CIPHERTEXT") return 0n;
    // The UI shows a human sentence; keep the raw typed error inspectable.
    console.warn("[suitz] decrypt failed:", e);
    throw e;
  }
}
