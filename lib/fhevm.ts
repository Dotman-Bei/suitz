import type { ZamaSDK } from "@zama-fhe/sdk";
import { getWalletClient } from "@wagmi/core";
import { wagmiConfig } from "./wagmi";
import { publicClient } from "./viemClient";
import { SEPOLIA_RPC } from "./network";

/**
 * One SDK instance per connected account. The SDK's ViemSigner signs with the
 * wallet client's HOISTED account (`walletClient.account`) — it never falls
 * back to eth_accounts — so the client must come from wagmi's connector
 * (account-bound) and the instance must be rebuilt when the account changes.
 */
let current: { key: string; promise: Promise<ZamaSDK> } | null = null;

/**
 * Lazily create + cache the Zama SDK for the connected wallet (browser only).
 *
 * Everything is imported dynamically so the SDK's Web-Worker/WASM machinery
 * never touches the server bundle (per the SDK's own Next.js guidance). The
 * Sepolia chain preset ships all protocol addresses (ACL / KMS / relayer /
 * registry); we only override the RPC with ours. The transport key pair
 * persists in IndexedDB, but permits live in memory only (`permitStorage`), so
 * every session takes exactly ONE EIP-712 signature and all further decrypts
 * in it are silent — the Zama-documented "high-security flows" split.
 */
export async function getZama(): Promise<ZamaSDK> {
  if (typeof window === "undefined") throw new Error("Zama SDK is browser-only");

  // The same connector client the app's wagmi writes use — account + chain
  // bound, and the provider the user actually connected with (not blindly
  // window.ethereum, which may be a different extension).
  const walletClient = await getWalletClient(wagmiConfig);
  const account = walletClient?.account?.address;
  if (!account) throw new Error("Wallet not connected");

  const key = account.toLowerCase();
  if (current?.key === key) return current.promise;

  const prev = current;
  const promise = (async () => {
    // A different account owns the old instance — tear its worker down first.
    if (prev) {
      try {
        (await prev.promise).terminate();
      } catch {
        /* previous instance never initialised — nothing to clean up */
      }
    }

    const [{ ZamaSDK: SDK, memoryStorage }, { web }, { createConfig }, { sepolia }] =
      await Promise.all([
        import("@zama-fhe/sdk"),
        import("@zama-fhe/sdk/web"),
        import("@zama-fhe/sdk/viem"),
        import("@zama-fhe/sdk/chains"),
      ]);

    const config = createConfig({
      chains: [{ ...sepolia, network: SEPOLIA_RPC }],
      publicClient,
      walletClient,
      relayers: { [sepolia.id]: web() },
      // Keep permits out of long-lived storage: one signature per session
      // (dies with the tab), while the transport key pair stays in IndexedDB.
      permitStorage: memoryStorage,
      // The SDK is silent by default; in dev, surface worker/relayer tracing.
      ...(process.env.NODE_ENV === "development" ? { logger: console } : {}),
    });
    return new SDK(config);
  })();

  current = { key, promise };
  promise.catch(() => {
    // allow retry on next call
    if (current?.promise === promise) current = null;
  });
  return promise;
}
