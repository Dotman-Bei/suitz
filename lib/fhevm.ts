import type { createInstance } from "@zama-fhe/relayer-sdk/web";
import { SEPOLIA_RPC } from "./network";

export type FhevmInstance = Awaited<ReturnType<typeof createInstance>>;

let instancePromise: Promise<FhevmInstance> | null = null;

/**
 * Lazily load + initialise the FHEVM relayer SDK (browser only).
 *
 * The SDK is imported dynamically so its WASM never touches the server bundle,
 * and the instance is created once (singleton) on first decrypt. Sepolia config
 * (ACL / KMS / gateway / relayer URLs) comes from the SDK's SepoliaConfig.
 */
export function getFhevm(): Promise<FhevmInstance> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("FHEVM instance is browser-only"));
  }
  if (!instancePromise) {
    instancePromise = (async () => {
      const { initSDK, createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");
      await initSDK(); // loads the TFHE/KMS WASM
      return createInstance({ ...SepoliaConfig, network: SEPOLIA_RPC });
    })().catch((err) => {
      instancePromise = null; // allow retry on next call
      throw err;
    });
  }
  return instancePromise;
}
