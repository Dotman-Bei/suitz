import { getWalletClient } from "@wagmi/core";
import { getFhevm } from "./fhevm";
import { wagmiConfig } from "./wagmi";

/** All-zero handle ⇒ uninitialised balance ⇒ cleartext 0 (no signature needed). */
export const ZERO_HANDLE = /^0x0*$/;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const errText = (e: unknown) =>
  (e instanceof Error ? e.message : String(e)).toLowerCase();

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
  return /\b429\b|rate.?limit|too many requests/.test(errText(e));
}

/**
 * Transient relayer/KMS failures: the handle isn't ingested yet, the ACL hasn't
 * propagated, we were throttled, or the relayer had a blip. Honest classifier —
 * rate limits ARE transient. Whether to *retry* one is a separate policy call
 * (see `isRetryableTransient`). Excludes wallet/signature rejections.
 */
export function isTransientRelayerError(e: unknown): boolean {
  if (isNotReadyError(e) || isRateLimitedError(e)) return true;
  return /timeout|timed out|network|fetch failed|\b50[234]\b|gateway|unavailable/.test(
    errText(e),
  );
}

/**
 * Retry policy for client-driven decrypts: retry the errors that resolve on
 * their own (coprocessor ingestion, ACL propagation, infra blips) but NOT rate
 * limits — auto-retrying a 429 just extends the throttle window, so those fail
 * fast to the user with a "try again in a moment" message instead.
 */
function isRetryableTransient(e: unknown): boolean {
  return isTransientRelayerError(e) && !isRateLimitedError(e);
}

/**
 * Map a decrypt failure to a user-facing message. Shared by every decrypt entry
 * point (Decrypt tab + the inline reveal in the Unwrap tab) so the wording stays
 * consistent. These surface only *after* the in-SDK retries are exhausted, so
 * they name the real cause instead of blaming the relayer for a timing race.
 */
export function humanDecryptError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/reject|denied|signature|user/i.test(msg)) return "Signature rejected.";
  if (isNotReadyError(e))
    return "Balance is still settling on-chain. Give it a few seconds and try again.";
  if (isRateLimitedError(e))
    return "Too many decrypt requests right now. Try again in a moment.";
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
 * Run the EIP-712 user-decryption for a single ERC-7984 ciphertext handle and
 * return the cleartext as a bigint. One wallet signature, no gas: the value is
 * re-encrypted to an ephemeral keypair and decrypted locally, scoped to `user`.
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
  if (ZERO_HANDLE.test(handle)) return 0n;

  // Resolve the connected wallet imperatively instead of depending on wagmi's
  // useWalletClient() hook, whose `.data` can be `undefined` while connected.
  // That stale null silently aborted the decrypt (no signature prompt ever
  // appeared). getWalletClient() returns the same connector client that
  // writeContract uses, so it's as reliable as the wrap/unwrap tx path.
  const walletClient = await getWalletClient(wagmiConfig);
  if (!walletClient) throw new Error("Wallet not connected");

  const instance = await getFhevm();
  const keypair = instance.generateKeypair();
  const start = Math.floor(Date.now() / 1000);
  const durationDays = 7;
  const contracts = [token];
  const eip712 = instance.createEIP712(keypair.publicKey, contracts, start, durationDays);

  // The SDK's EIP-712 shape is dynamic; viem's generics can't infer it.
  const signParams = {
    account: user,
    domain: eip712.domain,
    types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    primaryType: "UserDecryptRequestVerification",
    message: eip712.message,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const signature: string = await walletClient.signTypedData(signParams);

  // Sign once, above; only the relayer round-trip is retried. The EIP-712 grant
  // is valid for `durationDays`, so a few seconds of backoff stays well inside
  // its window and never re-prompts the wallet.
  const res = await withRelayerRetry(
    () =>
      instance.userDecrypt(
        [{ handle, contractAddress: token }],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace(/^0x/, ""),
        contracts,
        user,
        start,
        durationDays,
      ),
    { attempts, delayMs, retryOn: isRetryableTransient },
  );

  const clear = res[handle];
  return typeof clear === "bigint" ? clear : BigInt(clear as string);
}

/**
 * PUBLIC decryption of a single handle — used to finalize an unwrap.
 *
 * Unlike userDecrypt (private, EIP-712, no proof), publicDecrypt returns the
 * cleartext together with the KMS `decryptionProof`. That pair is exactly what
 * the wrapper's `finalizeUnwrap(handle, amount, signatures)` expects to release
 * the ERC-20. Right after the unwrap tx is mined the coprocessor may not have
 * ingested the ciphertext yet, so the relayer answers `not_ready_for_decryption`
 * for a few seconds — we retry with a short backoff until it resolves.
 */
export async function publicDecryptHandle(
  handle: `0x${string}`,
  { attempts = 20, delayMs = 3000 }: { attempts?: number; delayMs?: number } = {},
): Promise<{ amount: bigint; proof: `0x${string}` }> {
  const instance = await getFhevm();
  // Finalize path: the ciphertext is guaranteed to exist on-chain, so retry on
  // any error (not just the transient set) until the coprocessor catches up.
  return withRelayerRetry(
    async () => {
      const res = await instance.publicDecrypt([handle]);
      // one handle in ⇒ one value out; read it position-independently
      const raw = Object.values(res.clearValues)[0];
      const amount = typeof raw === "bigint" ? raw : BigInt(raw as string);
      return { amount, proof: res.decryptionProof as `0x${string}` };
    },
    { attempts, delayMs, retryOn: () => true },
  );
}
