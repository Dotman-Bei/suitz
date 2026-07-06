# suitz

**The confidential wrapper registry.** suitz is the canonical home for Zama
ERC-20 ↔ ERC-7984 wrapper pairs on Sepolia: browse the official onchain
Wrappers Registry, faucet the cTokenMocks, wrap, decrypt any confidential
balance, and unwrap — in one place built so that *using existing wrappers is the
path of least resistance*.

> Built for the Zama Developer Program · Season 3. See [ROADMAP.md](ROADMAP.md)
> for the full plan and requirements traceability.

---

## The brand

The wordmark is `suitz`. The two white marks — the **dot on the i** and the
**z** — are white knockouts living inside small black "keycap" tiles. It reads
as a system rather than a coincidence, and the keycap motif nods to the product:
**keys, ciphertext, reveal.** The whole identity is strictly black & white;
colour appears only as a muted brick red on error states, never as decoration.

Design language: Swiss/editorial — numbered sections, thin rules, generous
whitespace, a data table (not a card grid) for the registry, and monospace for
all onchain data. The signature interaction is an encrypted balance rendered as
blurred `████` ciphertext that visibly **decrypts** into a real number.

| Role | Typeface |
|------|----------|
| Display / logo | Space Grotesk |
| UI / body | Inter |
| Addresses, amounts, ciphertext | JetBrains Mono |

---

## Features (and where each requirement lives)

| Tab | What it does | Requirement |
|-----|--------------|-------------|
| **Registry** | Renders every ERC-20 ↔ ERC-7984 pair from the onchain registry + local config, with metadata and both addresses. Search + official/local filter. | Read registry, hybrid sourcing, coverage |
| **Wrap / Unwrap** | Approval → wrap stepper; and the honest async **unwrap** state machine: encrypt → submit → *decryption-oracle finalize* → settle. | Wrap/unwrap, access control, async UX |
| **Decrypt Any** | EIP-712 user decryption of the connected wallet's balance on **any** ERC-7984 — registry or not — via paste or auto-detect, with an interface probe for bad addresses. | User decryption of arbitrary tokens |
| **Faucet** | Claim the official cTokenMocks, then jump straight to wrapping. | Sepolia faucet |

Error handling (wrong network, missing approval, insufficient balance, non-
ERC-7984 address, no funds) is surfaced as human sentences — never a raw revert.

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

Requires Node 18.18+ (Next.js 14).

---

## Project structure

```
app/
  layout.tsx          fonts, providers, header/footer shell
  page.tsx            tab orchestrator
  globals.css         the design system (tokens, components, motifs)
  icon.svg            the z-keycap favicon
components/
  brand/Logo.tsx      the suitz wordmark + standalone mark
  layout/             Header, Footer, WalletButton, NetworkBadge
  nav/TabNav.tsx
  sections/Masthead.tsx
  views/              RegistryView, WrapView, DecryptView, FaucetView
  ui/                 Button, SourceBadge, AddressTag, EncryptedValue, …
  providers/          WalletProvider (mock), AppStore (nav + balances)
lib/
  types.ts            domain types (mirror the live integration shape)
  registry.ts         onchain read (mocked) + hybrid resolvePairs()
  format.ts           address/number/ciphertext helpers
config/
  pairs.ts            LOCAL override layer for custom/dev pairs
```

### Data layer — mock today, real tomorrow

The UI is written entirely against typed interfaces, so the integration phase is
a localized swap, not a rewrite. The seams:

- **`components/providers/WalletProvider.tsx`** → replace with wagmi
  `useAccount` / `useChainId` / connectors.
- **`lib/registry.ts → fetchRegistry()`** → replace the mock array with a
  `readContract` against the deployed WrappersRegistry + multicall metadata.
- **`WrapView` / `DecryptView` flow functions** → replace the `setTimeout`
  simulations with the relayer SDK (`createEncryptedInput`, `userDecrypt`),
  `writeContract`, and the decryption-oracle callback poll.

Everything marked ⚠️ in [ROADMAP.md §8](ROADMAP.md) (addresses, ABIs, SDK
version) must be confirmed against the live Zama docs before deploy.

---

## How the registry is sourced (hybrid)

1. **Primary — onchain.** `lib/registry.ts` reads the official WrappersRegistry
   on Sepolia as the source of truth.
2. **Augment — local.** `config/pairs.ts` declares custom/dev-only pairs.
3. **Resolve.** `resolvePairs()` merges them; on collision the **onchain
   (official) record always wins**, and a local pair's badge flips to `official`
   automatically once it appears onchain.

## Adding a new pair

**A) Local dev pair (instant):** edit `config/pairs.ts`:

```ts
LOCAL_PAIRS.push({
  id: "cfoo",
  source: "local",
  chainId: 11155111,
  underlying:    { address: "0x…", symbol: "FOO",  name: "Foo Token",        decimals: 18 },
  confidential:  { address: "0x…", symbol: "cFOO", name: "Confidential Foo",  decimals: 18 },
});
```

Save — it appears in the Registry tab badged `local`, fully wrap/unwrap/decrypt-
able.

**B) Canonical onchain pair:** register it in the official WrappersRegistry. On
the next refresh suitz reads it as `official` with **zero app code changes** —
the point of being registry-native.

---

## License

MIT — open source. All tokens are testnet mocks on Sepolia and hold no value.
