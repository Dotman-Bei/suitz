import type { WalletClient } from "viem";
import { getFhevm } from "./fhevm";

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
  walletClient: WalletClient,
): Promise<bigint> {
  if (ZERO_HANDLE.test(handle)) return 0n;

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
