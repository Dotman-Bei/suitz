# suitz.

**The confidential wrapper registry.** suitz is the canonical home for Zama
ERC-20 ↔ ERC-7984 wrapper pairs on Sepolia: browse the official onchain
Wrappers Registry, faucet the cTokenMocks, wrap, decrypt any confidential
balance, and unwrap, in one place built so that *using existing wrappers is the
path of least resistance*.

> Built for the Zama Developer Program · Season 3, the Confidential Wrapper
> Registry bounty.

* **Live demo:** <https://suitz.xyz/>

* **Network:** Ethereum Sepolia

* **License:** [MIT](LICENSE)

***

## Features (and where each requirement lives)

| Tab               | What it does                                                                                                                                                                                                                                   | Requirement                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Registry**      | Renders every ERC-20 ↔ ERC-7984 pair from the onchain registry + local config, with metadata and both addresses. Search + official/local filter.                                                                                               | Read registry, hybrid sourcing, coverage |
| **Wrap / Unwrap** | Approval → wrap stepper; and the honest async **unwrap** state machine: encrypt → submit → *decryption-oracle finalize* → settle.                                                                                                              | Wrap/unwrap, access control, async UX    |
| **Decrypt Any**   | EIP-712 user decryption of the connected wallet's balance on **any** ERC-7984, registry or not. Paste any address; the wallet scan auto-surfaces the registry tokens you already hold. Bad addresses are caught by an onchain interface probe. | User decryption of arbitrary tokens      |
| **Faucet**        | Claim the official cTokenMocks, then jump straight to wrapping.                                                                                                                                                                                | Sepolia faucet                           |

Error handling (wrong network, missing approval, insufficient balance, non-
ERC-7984 address, no funds) is surfaced as human sentences.

***

## Getting started

```bash
npm install
cp .env.example .env.local   # optional - sensible public defaults ship out of the box
npm run dev                  # http://localhost:3000
```

Requires Node 18.18+ (Next.js 14). Connect any injected wallet
(MetaMask/Rabby/Brave) on Sepolia. You'll need a little Sepolia ETH for gas.

Scripts:

```bash
npm run dev        # local dev server
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint (eslint-config-next)
npm run format     # prettier --write
npm test           # vitest unit tests
```

### Environment variables

Everything runs on public defaults, so no configuration is required to try it.
Override only what you need; see [`.env.example`](.env.example):

| Variable                  | Default              | Purpose                                                                                                                                                             |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SEPOLIA_RPC` | a public Sepolia RPC | A keyed RPC (Alchemy/Infura/…). **Recommended for any deployment**, the public endpoint rate-limits under registry multicall + judging traffic.                     |
| `NEXT_PUBLIC_REPO_URL`    | _(unset)_            | Your repo URL. When set, the **Add pair** modal offers a one-click "Suggest on GitHub" that opens a pre-filled issue. Left unset, the modal just hides that button. |

No secrets are required for the app itself; wallet signing happens client-side,
and the injected connector needs no WalletConnect project id.

***

## Project structure

```
app/
  layout.tsx          fonts, providers (Web3 + store), header/footer shell
  page.tsx            marketing landing (hero, how-it-works, FAQ, CTA)
  console/page.tsx    the product: the four-tab console
  globals.css         the design system (tokens, components, motifs)
  icon.svg            the z-keycap favicon
components/
  brand/Logo.tsx      the suitz wordmark + standalone mark
  layout/             Header, Footer, WalletButton, NetworkBadge
  wallet/ConnectModal connector picker
  nav/TabNav.tsx      console tab bar
  sections/           landing sections + the Console orchestrator
  views/              RegistryView, WrapView, DecryptView, FaucetView, AddPairModal
  ui/                 Button, SourceBadge, AddressTag, EncryptedValue, Alert, …
  motion/ decor/      Reveal / ScrambleText / Counter animations, background doodles
  providers/          Web3Provider (wagmi + react-query), WalletProvider, AppStore
lib/
  wagmi.ts            wagmi config (Sepolia, injected connector)
  viemClient.ts       shared read-only viem public client
  network.ts          RPC + repo-url env resolution
  registry.ts         onchain registry read + hybrid resolvePairs() + probe/hydrate
  abis.ts             typed ERC-20 + ERC-7984 wrapper ABIs
  fhevm.ts            lazy singleton for the Zama SDK (browser-only WASM worker)
  fheDecrypt.ts       user-decryption helper (permits + caching via the Zama SDK)
  confidential.ts     wrapper decimals (uint64-safe) reader + cache
  types.ts            domain types
  format.ts           address/number/explorer helpers
config/
  pairs.ts            LOCAL override layer (address-only) for custom/dev pairs
scripts/
  finalize-unwrap.mjs recover a stuck unwrap from the CLI (see below)
```

### Data layer: live onchain

The app runs against Sepolia directly; there is no mock layer.

* **Wallet & transactions**: `wagmi` + `viem`. Reads (balances, allowances,
  balance handles) go through a shared public client; writes (`approve`, `wrap`,
  `unwrap`, `finalizeUnwrap`, faucet `mint`) go through the injected connector.

* **Registry**: `lib/registry.ts` reads the onchain `WrappersRegistry` and
  multicall-hydrates token metadata, with a verified in-repo seed as a graceful
  fallback (details below).

* **Confidential compute**: the **Zama SDK** (`@zama-fhe/sdk`). The
  `ZamaSDK` singleton (`lib/fhevm.ts`) powers EIP-712 **user decryption**
  (Decrypt tab), one signature per session creates a reusable permit (kept in
  memory only, so it dies with the tab; the security-conservative split Zama
  documents), and every further decrypt that session is silent, and a
  `WrappedToken` orchestrates the two-phase **unwrap** (encrypt → burn →
  public-decryption proof → finalize), persisting interrupted unwraps so they
  stay claimable across reloads. The SDK is dynamically imported so its WASM
  worker never touches the server bundle.

Because the UI is written entirely against the typed domain model in
`lib/types.ts`, contract specifics stay isolated in `lib/` and never leak into
components.

***

## How the registry is sourced (hybrid)

1. **Primary: onchain.** `lib/registry.ts` reads the official
   `ConfidentialTokenWrappersRegistry` on Sepolia
   (`0x2f0750…128e`, an ERC-1967 proxy) as the source of truth. Each entry is a
   `(address tokenAddress, address confidentialTokenAddress, bool isValid)`
   tuple; revoked pairs (`isValid == false`) are filtered out. Token metadata
   (`name`/`symbol`/`decimals`, both sides) is hydrated via `multicall`.
2. **Augment: local.** `config/pairs.ts` and the in-app **Add pair** button
   contribute custom/dev-only pairs.
3. **Resolve.** `resolvePairs()` merges all sources keyed by confidential
   address; on collision the **onchain (official) record always wins**, and a
   local pair's badge flips to `official` automatically once it appears onchain.

If the onchain read fails (RPC down, ABI drift), it degrades gracefully to a
verified in-repo seed of the same pairs, so the app never shows an empty registry.
The seed is the coverage baseline asserted by the unit tests, so a mock can
never silently disappear from the app.

## Adding a new pair

Three routes, same underlying mechanism. **You only ever supply the ERC-7984
wrapper address**, the underlying ERC-20 is derived onchain from the wrapper's
`underlying()` getter, and all metadata is read onchain, so a pair can never
carry wrong or stale metadata (`probeConfidentialToken()` in `lib/registry.ts`).

**A) Live, zero-code (instant, works on the deployed URL):**
In the **Registry** tab, click **Add pair**, paste the ERC-7984 wrapper address,
and confirm the preview. It's validated onchain, badged `local`, persisted to
your browser (`localStorage`), and immediately wrap/unwrap/decrypt-able. Use the
modal's **Copy config** to turn it into a permanent `config/pairs.ts` edit, or, if
`NEXT_PUBLIC_REPO_URL` is set, **Suggest on GitHub** to open a pre-filled
issue.

**B) Committed dev pair, edit** **`config/pairs.ts`:**

Add an entry to the `LOCAL_PAIRS` array (this is exactly what the modal's **Copy
config** button gives you):

&#x20;You can use this custom made token to test out the "Add New Pair" section:

```
0xBd64e6f2DfD61dBF763a305d88Caad45Bcf33EBd 
```

```ts
export const LOCAL_PAIRS: LocalPairInput[] = [
  {
    confidential: "0xYourErc7984WrapperAddress", // that's it, metadata is read onchain
    note: "my hackathon token",                  // optional
  },
];
```

Save. It appears in the Registry tab badged `local`, fully wrap/unwrap/decrypt-
able. (Pass `underlying: "0x…"` only if your wrapper doesn't expose
`underlying()` and you must override it.)

**C) Canonical onchain pair (the real path):**
Register it in the official registry. The confidential token must advertise the
ERC-7984 interface via ERC-165 (`supportsInterface(0x4958f2a4)`), and
registration is `onlyOwner` (Zama curates canonical pairs):

```solidity
registry.registerConfidentialToken(
  tokenAddress,            // your ERC-20
  confidentialTokenAddress // its ERC-7984 wrapper
);
```

On the next refresh suitz reads it as `official` with **zero app code changes**,
the point of being registry-native.

***

## The flows, briefly

* **Faucet** calls each cTokenMock's public `mint(to, amount)`, then re-reads
  the ERC-20 balance so it updates live.

* **Wrap (ERC-20 → ERC-7984)** is the classic two-step: check `allowance`, and
  only `approve` if it's short, then `wrap(to, amount)` (plaintext amount → mints
  an encrypted balance). Each step is its own state in the stepper.

* **Decrypt (EIP-712 user decryption)**: read the `confidentialBalanceOf`
  handle and decrypt it through the Zama SDK — **one wallet signature (no gas)
  per session** creates a reusable permit (held in memory, never in long-lived
  storage), so every further decrypt that session needs no prompt. The cleartext
  is scoped to the connected wallet and never leaves the browser. Works on any
  ERC-7984 address, in the registry or not.

* **Unwrap (ERC-7984 → ERC-20): the async one.** This is not atomic on FHEVM
  and is a **two-step, dApp-driven** flow, orchestrated by the Zama SDK's
  `WrappedToken.unshield()`:

  1. The amount is encrypted client-side → `unwrap(from, to, enc, proof)` burns
     the ERC-7984 and emits `UnwrapRequested` carrying the euint64 handle queued
     for public decryption.
  2. The SDK waits for the public decryption (cleartext + KMS proof) →
     `finalizeUnwrap(handle, amount, proof)` releases the ERC-20. The UI models
     `encrypting → submitting → finalizing → settled` explicitly via the SDK's
     progress callbacks, and if the second tx fails the burned balance is
     surfaced as a **claimable pending unwrap** — persisted by the SDK, so the
     claim survives page reloads and is resumed with `resumeUnshield()`.

## Recovering a stuck unwrap (dev)

`finalizeUnwrap` is permissionless (the ERC-20 goes to the recipient recorded at
unwrap time), so a stuck unwrap can always be finalized: from the UI's "Claim"
button, or standalone from the CLI:

```bash
# from the unwrap tx hash (extracts the handle automatically):
node scripts/finalize-unwrap.mjs --tx 0x<unwrapTxHash>

# print calldata only (default), or submit directly with a funded testnet key:
PRIVATE_KEY=0x... node scripts/finalize-unwrap.mjs --tx 0x<unwrapTxHash> --send
```

***

## Deploying

The app is a standard Next.js 14 project and deploys cleanly to Vercel (or any
Node host):

1. Import the repo into Vercel (framework preset: **Next.js**).
2. Set `NEXT_PUBLIC_SEPOLIA_RPC` to a keyed RPC endpoint (recommended).
   Optionally set `NEXT_PUBLIC_REPO_URL`.
3. Deploy, then paste the resulting URL into **Live demo** at the top of this
   README.

The Zama SDK's WASM uses `SharedArrayBuffer` + worker threads for
input-proof generation, which requires **cross-origin isolation**. The required
`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy:
credentialless` headers are already configured in
[`next.config.mjs`](next.config.mjs) and are honoured by Vercel automatically.
On other hosts, make sure those response headers survive.

***

## Quality

* **TypeScript strict** across the codebase (`tsc --noEmit` clean).

* **ESLint** via `eslint-config-next` (`next/core-web-vitals`).

* **Prettier** for formatting.

* **Vitest** unit tests for the pure logic that matters most: the hybrid
  `resolvePairs()` merge (official-wins on collision, ordering) and the official
  cTokenMock **coverage assertion** (see `lib/registry.test.ts`).

* **Typed ABIs** (`viem` `parseAbi`) so contract calls are checked at compile time.

* **Graceful degradation**: a verified seed keeps the registry populated if the
  RPC is unavailable.

***

## License

MIT. See [LICENSE](LICENSE). All tokens are testnet mocks on Sepolia and hold
no value.
