import { getWalletClient } from "@wagmi/core";
import { getFhevm } from "./fhevm";
import { wagmiConfig } from "./wagmi";

/** All-zero handle ⇒ uninitialised balance ⇒ cleartext 0 (no signature needed). */
export const ZERO_HANDLE = /^0x0*$/;

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

  const res = await instance.userDecrypt(
    [{ handle, contractAddress: token }],
    keypair.privateKey,
    keypair.publicKey,
    signature.replace(/^0x/, ""),
    contracts,
    user,
    start,
    durationDays,
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
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await instance.publicDecrypt([handle]);
      // one handle in ⇒ one value out; read it position-independently
      const raw = Object.values(res.clearValues)[0];
      const amount = typeof raw === "bigint" ? raw : BigInt(raw as string);
      return { amount, proof: res.decryptionProof as `0x${string}` };
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Public decryption failed");
}
