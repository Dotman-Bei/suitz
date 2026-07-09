import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { ScrambleText } from "@/components/motion/ScrambleText";
import { SectionDoodles } from "@/components/decor/Doodles";
import { ArrowRight, ExternalLink } from "@/components/ui/Icons";
import { AddressTag } from "@/components/ui/AddressTag";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocsNav, type DocsNavItem } from "@/components/docs/DocsNav";
import { OFFICIAL_PAIRS, REGISTRY_ADDRESS_SEPOLIA } from "@/lib/registry";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Everything about suitz: concepts, the four console flows, hybrid registry sourcing, adding a pair, error handling, contract addresses, and local development.",
};

const SECTIONS: DocsNavItem[] = [
  { id: "overview", index: "01", label: "Overview" },
  { id: "concepts", index: "02", label: "Concepts" },
  { id: "getting-started", index: "03", label: "Getting started" },
  { id: "console", index: "04", label: "The console" },
  { id: "flows", index: "05", label: "The four flows" },
  { id: "sourcing", index: "06", label: "Registry sourcing" },
  { id: "add-pair", index: "07", label: "Adding a pair" },
  { id: "errors", index: "08", label: "Error handling" },
  { id: "contracts", index: "09", label: "Contract reference" },
  { id: "development", index: "10", label: "Development & deploy" },
  { id: "security", index: "11", label: "Security & trust" },
];

export default function DocsPage() {
  return (
    <div className="relative overflow-hidden pb-24 pt-28 sm:pt-32">
      <SectionDoodles variant="docs" />
      <div className="shell relative">
        <Reveal>
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-400 transition hover:text-ink-900"
          >
            <ArrowRight width={13} height={13} className="rotate-180 transition group-hover:-translate-x-0.5" />
            suitz home
          </Link>

          <p className="eyebrow mt-7">Docs</p>
          <ScrambleText
            as="h1"
            text="Documentation."
            className="mt-4 block max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl"
          />
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
            Everything about suitz in one place: the concepts behind confidential
            tokens, how each console flow works under the hood, how the registry is
            sourced, how to add your own pair, and how to run the app yourself.
          </p>

          {/* quick facts */}
          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            {[
              ["Network", "Ethereum Sepolia"],
              ["Chain id", "11155111"],
              ["Standard", "ERC-20 ↔ ERC-7984"],
              ["License", "MIT"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="mono-label">{k}</dt>
                <dd className="mt-1 font-mono text-sm text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          <aside className="self-start lg:sticky lg:top-28">
            <p className="mono-label mb-4 hidden lg:block">On this page</p>
            <DocsNav items={SECTIONS} />
          </aside>

          <article className="min-w-0 space-y-16">
            {/* ── 01 · Overview ──────────────────────────────────────────── */}
            <DocSection id="overview" index="01" title="Overview">
              <P>
                <strong className="font-medium text-ink-900">suitz</strong> is the
                canonical home for Zama ERC-20 ↔ ERC-7984 wrapper pairs on Sepolia.
                It renders the official onchain Wrappers Registry as a product:
                browse every canonical pair, faucet the official cTokenMocks, wrap
                an ERC-20 into its confidential form, decrypt any confidential
                balance you own, and unwrap back, in one place, built so that
                <em> using existing wrappers is the path of least resistance</em>.
              </P>
              <P>Three principles shape the whole app:</P>
              <ul className="space-y-3">
                <Bullet title="Registry-native, not registry-aware.">
                  The onchain registry is the source of truth; the UI is a faithful,
                  real-time mirror of it, with a documented local-override layer for
                  dev pairs. suitz doesn&rsquo;t fork the data; it renders it.
                </Bullet>
                <Bullet title="Honest about FHE async.">
                  Unwrapping is not instant on FHEVM: there is a decryption-oracle
                  round trip before the ERC-20 is released. suitz models that
                  explicitly (<Mono>encrypting → submitting → finalizing → settled</Mono>)
                  instead of pretending it&rsquo;s atomic.
                </Bullet>
                <Bullet title="Decrypt anything you own.">
                  The Decrypt tab reveals the connected wallet&rsquo;s balance on{" "}
                  <em>any</em> ERC-7984 address, pasted or auto-detected, even if
                  it was never registered. One EIP-712 signature, no gas, revealed
                  only to you.
                </Bullet>
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <a href="https://suitz.xyz/" target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                  Live app <ExternalLink width={13} height={13} />
                </a>
                <a href="https://github.com/Dotman-Bei/suitz/" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  GitHub repository <ExternalLink width={13} height={13} />
                </a>
                <Link href="/console" className="btn btn-outline btn-sm">
                  Open the console <ArrowRight width={13} height={13} />
                </Link>
              </div>
            </DocSection>

            {/* ── 02 · Concepts ─────────────────────────────────────────── */}
            <DocSection id="concepts" index="02" title="Concepts">
              <Term name="ERC-7984">
                Zama&rsquo;s confidential fungible token standard. Balances and
                transfer amounts are encrypted onchain with fully homomorphic
                encryption (FHE), so amounts stay private while remaining
                verifiable. Reading a balance returns an encrypted{" "}
                <em>handle</em> (a pointer to ciphertext), not a number. Tokens
                advertise the standard via ERC-165{" "}
                <Mono>supportsInterface(0x4958f2a4)</Mono>.
              </Term>
              <Term name="Wrapper pair">
                A canonical pairing of a public ERC-20 with its confidential
                ERC-7984 wrapper. The wrapper holds deposited ERC-20 and mints an
                equal confidential balance; unwrapping burns the confidential
                balance and releases the ERC-20. Wrappers expose their underlying
                via an onchain <Mono>underlying()</Mono> getter.
              </Term>
              <Term name="The Wrappers Registry">
                An onchain contract on Sepolia that enumerates every canonical
                pair as{" "}
                <Mono>(tokenAddress, confidentialTokenAddress, isValid)</Mono>{" "}
                tuples. Registration is <Mono>onlyOwner</Mono> (Zama curates the
                canonical list), and revoked pairs stay in the array with{" "}
                <Mono>isValid = false</Mono>. suitz treats this contract as the
                single source of truth (see{" "}
                <a href="#sourcing" className="underline underline-offset-4 hover:text-ink-900">Registry sourcing</a>).
              </Term>
              <Term name="FHEVM & the Zama SDK">
                The FHEVM coprocessor executes FHE operations offchain and a KMS
                controls decryption. In the browser, the{" "}
                <Mono>@zama-fhe/sdk</Mono> handles the three cryptographic jobs
                suitz needs: encrypting inputs (the unwrap amount), EIP-712{" "}
                <em>user decryption</em> (private, for your own balances, behind
                a reusable permit), and <em>public decryption</em> (oracle-backed,
                used to finalize an unwrap).
              </Term>
              <Term name="User vs. public decryption">
                <em>User decryption</em> reveals a value only to the wallet that
                signs an EIP-712 grant: one signature, no gas, decrypted locally
                in the browser. <em>Public decryption</em> reveals a value to
                everyone via the decryption oracle with a KMS proof; that&rsquo;s
                what an unwrap needs before the ERC-20 can be released, and why
                unwrapping is asynchronous.
              </Term>
            </DocSection>

            {/* ── 03 · Getting started ──────────────────────────────────── */}
            <DocSection id="getting-started" index="03" title="Getting started">
              <P>
                You need an injected wallet (MetaMask, Rabby, Brave…) and a little
                Sepolia ETH for gas; any public Sepolia faucet works. No account,
                no API key, no WalletConnect project id.
              </P>
              <H3>The 60-second tour</H3>
              <Steps
                items={[
                  <>Open the <Link href="/console" className="underline underline-offset-4 hover:text-ink-900">console</Link> and connect your wallet. If you&rsquo;re on the wrong network, suitz offers a one-click switch to Sepolia.</>,
                  <>In <strong className="font-medium text-ink-900">Faucet</strong>, claim an official cTokenMock, say USDCMock. Your ERC-20 balance updates live.</>,
                  <>In <strong className="font-medium text-ink-900">Wrap</strong>, approve (only if needed) and wrap it. Your new confidential balance arrives as an encrypted handle, deliberately unreadable.</>,
                  <>In <strong className="font-medium text-ink-900">Decrypt</strong>, sign once (EIP-712, no gas) to reveal the balance. It decrypts locally, visible only to you.</>,
                  <>Back in <strong className="font-medium text-ink-900">Unwrap</strong>, send it back to plain ERC-20 and watch the honest <Mono>finalizing</Mono> state while the decryption oracle does its round trip.</>,
                ]}
              />
              <P>
                Running it locally instead? Jump to{" "}
                <a href="#development" className="underline underline-offset-4 hover:text-ink-900">Development &amp; deploy</a>.
              </P>
            </DocSection>

            {/* ── 04 · The console ──────────────────────────────────────── */}
            <DocSection id="console" index="04" title="The console">
              <P>
                Everything operational lives at{" "}
                <Link href="/console" className="underline underline-offset-4 hover:text-ink-900">
                  /console
                </Link>{" "}
                behind four tabs: one mental model, no hidden pages.
              </P>
              <div className="grid gap-4 sm:grid-cols-2">
                <TabCard n="01" title="Registry">
                  The canonical list. Every ERC-20 ↔ ERC-7984 pair from the onchain
                  registry plus your local pairs, with full metadata and both
                  addresses. Search, filter by official/local, add a pair, and jump
                  straight into wrapping.
                </TabCard>
                <TabCard n="02" title="Wrap / Unwrap">
                  The conversion workbench for a selected pair. Approval → wrap as a
                  stepper; unwrap as the async state machine with an explicit
                  oracle-finalize stage and a claim path if anything stalls.
                </TabCard>
                <TabCard n="03" title="Decrypt">
                  EIP-712 user decryption of the connected wallet&rsquo;s balance on
                  any ERC-7984: paste an address or pick one auto-detected from
                  your wallet. Non-token addresses are caught by an onchain probe.
                </TabCard>
                <TabCard n="04" title="Faucet">
                  Claim the official cTokenMocks so a brand-new wallet can try
                  everything in under a minute, then jump straight to wrapping.
                </TabCard>
              </div>
            </DocSection>

            {/* ── 05 · The four flows ───────────────────────────────────── */}
            <DocSection id="flows" index="05" title="The four flows">
              <H3>Faucet</H3>
              <P>
                Each official cTokenMock exposes a public{" "}
                <Mono>mint(to, amount)</Mono>. suitz calls it and re-reads the
                ERC-20 balance, so the update is live, not optimistic.
              </P>

              <H3>Wrap: ERC-20 → ERC-7984</H3>
              <P>
                The classic two-step, with the approval surfaced as its own state
                instead of a surprise revert:
              </P>
              <Steps
                items={[
                  <>Check <Mono>allowance(owner → wrapper)</Mono>.</>,
                  <>If it&rsquo;s short, <Mono>approve(wrapper, amount)</Mono> runs as its own step in the stepper.</>,
                  <><Mono>wrap(to, amount)</Mono>: a plaintext amount in, an encrypted balance out.</>,
                ]}
              />
              <P>
                After wrapping, the balance is an encrypted handle. suitz never
                pretends to know the number; decrypting it is one click away in
                the Decrypt tab.
              </P>

              <H3>Decrypt: EIP-712 user decryption</H3>
              <CodeBlock
                title="what happens on “decrypt”"
                code={`handle = confidentialBalanceOf(you)       // onchain read
permit = grantPermit(yourTokens)          // ONE EIP-712 signature, no gas —
                                          // covers every token, reused all session
balance = decryptValues(handle)           // re-encrypted by the relayer,
                                          // decrypted locally & cached`}
              />
              <P>
                The first decrypt of a session takes one signature — and that
                single permit covers <em>every</em> token in the registry at once,
                so switching tokens afterwards is silent (a brand-new address
                outside the registry costs one more signature to fold it in). The
                permit is held in memory only (never in long-lived storage), so
                closing the tab revokes it. The UI is honest about which path it
                took: it only says <em>awaiting signature</em> when it actually
                signs, and <em>session key found</em> when it reuses the saved
                permit with no prompt. The cleartext is scoped to the connected
                wallet and never leaves the browser. This works on any ERC-7984
                address, in the registry or not; suitz first probes the address
                onchain (<Mono>underlying()</Mono> / ERC-165) and gives a precise
                error if it isn&rsquo;t an ERC-7984 token. Transient relayer
                hiccups are retried automatically before you ever see an error.
              </P>

              <H3>Unwrap: ERC-7984 → ERC-20, the async one</H3>
              <P>
                Unwrapping is <em>not atomic</em> on FHEVM: the amount must be
                publicly decrypted by the oracle before the ERC-20 can move. suitz
                drives it as a two-step, dApp-driven flow:
              </P>
              <CodeBlock
                title="the unwrap state machine (WrappedToken.unshield)"
                code={`// 1: encrypting → submitting
enc, proof = encrypt(amount)                     // client-side, in a worker
unwrap(from, to, enc, proof)                     // burns cToken,
                                                 // emits UnwrapRequested(handle)

// 2: finalizing → settled
cleartext, kmsProof = publicDecrypt(handle)      // awaited while the
                                                 // coprocessor ingests
finalizeUnwrap(handle, cleartext, kmsProof)      // releases the ERC-20`}
              />
              <P>
                If the second transaction fails or is abandoned, nothing is lost:
                the burned balance surfaces as a{" "}
                <strong className="font-medium text-ink-900">claimable pending unwrap</strong>{" "}
                — persisted in your browser, so the claim survives a page reload —
                that you can retry from the UI at any time.
              </P>

              <H3>Recovering a stuck unwrap from the CLI</H3>
              <P>
                <Mono>finalizeUnwrap</Mono> is permissionless (the ERC-20 always
                goes to the recipient recorded at unwrap time), so a stuck unwrap
                can also be finalized standalone:
              </P>
              <CodeBlock
                title="scripts/finalize-unwrap.mjs"
                code={`# from the unwrap tx hash (extracts the handle automatically):
node scripts/finalize-unwrap.mjs --tx 0x<unwrapTxHash>

# print calldata only (default), or submit with a funded testnet key:
PRIVATE_KEY=0x... node scripts/finalize-unwrap.mjs --tx 0x<unwrapTxHash> --send`}
              />
            </DocSection>

            {/* ── 06 · Registry sourcing ────────────────────────────────── */}
            <DocSection id="sourcing" index="06" title="Registry sourcing (hybrid)">
              <Steps
                items={[
                  <>
                    <strong className="font-medium text-ink-900">Primary: onchain.</strong>{" "}
                    <Mono>lib/registry.ts</Mono> reads the official registry at{" "}
                    <AddressTag address={REGISTRY_ADDRESS_SEPOLIA} /> (an ERC-1967
                    proxy) and filters out revoked pairs (<Mono>isValid == false</Mono>).
                    Token metadata (<Mono>name</Mono> / <Mono>symbol</Mono> /{" "}
                    <Mono>decimals</Mono>, both sides) is hydrated via multicall.
                  </>,
                  <>
                    <strong className="font-medium text-ink-900">Augment: local.</strong>{" "}
                    <Mono>config/pairs.ts</Mono> plus anything added live through
                    the in-app <em>Add pair</em> modal (persisted to{" "}
                    <Mono>localStorage</Mono>) are merged on top, clearly badged{" "}
                    <span className="badge badge-local">local</span>.
                  </>,
                  <>
                    <strong className="font-medium text-ink-900">Resolve.</strong>{" "}
                    <Mono>resolvePairs()</Mono> merges all sources keyed by
                    confidential address. On collision the onchain record{" "}
                    <em>always</em> wins; a local pair&rsquo;s badge flips to{" "}
                    <span className="badge badge-official">official</span>{" "}
                    automatically once it appears onchain. Local never masquerades
                    as official.
                  </>,
                ]}
              />
              <P>
                If the onchain read fails (RPC down, ABI drift), the app degrades
                gracefully to a verified in-repo seed of the same pairs, so the
                registry is never empty. That seed doubles as the coverage baseline
                asserted by the unit tests, so an official mock can&rsquo;t silently
                disappear from the app.
              </P>
              <P>
                One more honesty detail: ERC-7984 wrappers report their own{" "}
                <Mono>decimals</Mono> (capped at 6 to stay uint64-safe), distinct
                from the underlying ERC-20&rsquo;s. suitz reads it onchain rather
                than mirroring the ERC-20&rsquo;s.
              </P>
            </DocSection>

            {/* ── 07 · Adding a pair ────────────────────────────────────── */}
            <DocSection id="add-pair" index="07" title="Adding a pair">
              <P>
                Three routes, one underlying mechanism. You only ever supply the{" "}
                <strong className="font-medium text-ink-900">ERC-7984 wrapper address</strong>:
                the underlying ERC-20 is derived onchain from the wrapper&rsquo;s{" "}
                <Mono>underlying()</Mono> getter and all metadata is read onchain
                (<Mono>probeConfidentialToken()</Mono>), so a pair can never carry
                wrong or stale metadata.
              </P>

              <H3>A: Live, zero-code (works on the deployed URL)</H3>
              <P>
                In the Registry tab, click{" "}
                <strong className="font-medium text-ink-900">Add pair</strong>, paste the
                wrapper address, confirm the preview. It&rsquo;s validated onchain,
                badged <span className="badge badge-local">local</span>, persisted
                to your browser, and immediately wrap/unwrap/decrypt-able. The
                modal&rsquo;s <em>Copy config</em> turns it into a permanent{" "}
                <Mono>config/pairs.ts</Mono> edit.
              </P>

              <H3>B: Committed dev pair</H3>
              <CodeBlock
                title="config/pairs.ts"
                code={`export const LOCAL_PAIRS: LocalPairInput[] = [
  {
    confidential: "0xYourErc7984WrapperAddress", // that's it: metadata is read onchain
    note: "my hackathon token",                  // optional
  },
];`}
              />
              <P>
                Save, and it appears in the Registry tab badged{" "}
                <span className="badge badge-local">local</span>. Pass{" "}
                <Mono>underlying: &quot;0x…&quot;</Mono> only if your wrapper
                doesn&rsquo;t expose <Mono>underlying()</Mono>.
              </P>

              <H3>C: Canonical onchain pair (the real path)</H3>
              <P>
                Register it in the official registry. The confidential token must
                advertise ERC-165 <Mono>supportsInterface(0x4958f2a4)</Mono>, and
                registration is <Mono>onlyOwner</Mono> (Zama curates canonical
                pairs):
              </P>
              <CodeBlock
                title="solidity"
                code={`registry.registerConfidentialToken(
  tokenAddress,            // your ERC-20
  confidentialTokenAddress // its ERC-7984 wrapper
);`}
              />
              <P>
                On the next refresh suitz reads it as{" "}
                <span className="badge badge-official">official</span> with zero
                app-code changes, which is the point of being registry-native.
              </P>
            </DocSection>

            {/* ── 08 · Error handling ───────────────────────────────────── */}
            <DocSection id="errors" index="08" title="Error handling">
              <P>
                The principle: you should never see an unparsed revert string.
                Every failure mode maps to a sentence a non-expert understands,
                with the raw error behind a details disclosure when it helps.
              </P>
              <DocTable
                head={["Condition", "What suitz does"]}
                rows={[
                  ["Wrong network", "Blocking banner with a one-click “Switch to Sepolia”."],
                  ["Missing or low allowance", "Approval becomes its own stepper step; wrap never reverts on allowance."],
                  ["Insufficient ERC-20 balance", "Wrap is disabled with a pointer to the Faucet tab."],
                  ["Address isn’t an ERC-7984 token", "The onchain interface probe fails with a precise message before any transaction."],
                  ["Transient relayer / oracle hiccup", "User decryption retries automatically behind a consistent, human message."],
                  ["Unwrap finalize fails or stalls", "The burned balance surfaces as a claimable pending unwrap; retry from the UI or the CLI script."],
                  ["You reject a signature or tx", "Soft reset to the previous state. No dead spinners."],
                ]}
              />
            </DocSection>

            {/* ── 09 · Contract reference ───────────────────────────────── */}
            <DocSection id="contracts" index="09" title="Contract reference">
              <H3>Wrappers Registry (Sepolia)</H3>
              <P>
                <AddressTag label="proxy" address={REGISTRY_ADDRESS_SEPOLIA} />, an
                ERC-1967 proxy in front of the Sourcify-verified{" "}
                <Mono>ConfidentialTokenWrappersRegistry</Mono> implementation.
              </P>
              <CodeBlock
                title="read + register surface"
                code={`getTokenConfidentialTokenPairsLength() → uint256
getTokenConfidentialTokenPairs()
  → (address tokenAddress, address confidentialTokenAddress, bool isValid)[]
getTokenConfidentialTokenPair(uint256 index) → (token, confidentialToken, isValid)
getConfidentialTokenAddress(address token) → (bool, address)
getTokenAddress(address confidentialToken) → (bool, address)
registerConfidentialToken(address token, address confidentialToken)  // onlyOwner`}
              />
              <P>
                The <Mono>isValid</Mono> flag is not optional: revoked pairs stay
                in the array with <Mono>isValid = false</Mono>, and omitting the
                field from the ABI silently mis-decodes the whole array.
              </P>

              <H3>Official pairs</H3>
              <P>
                The live list is always read onchain; this table is the verified
                in-repo seed that mirrors it (also the graceful-degradation
                fallback). Confidential wrappers all report 6 decimals
                (uint64-safe) regardless of the underlying&rsquo;s.
              </P>
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="reg-table">
                  <thead>
                    <tr>
                      <th>Pair</th>
                      <th>Underlying ERC-20</th>
                      <th>Confidential ERC-7984</th>
                      <th>Decimals (u / c)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OFFICIAL_PAIRS.map((p) => (
                      <tr key={p.confidential.address} className="reg-row">
                        <td className="whitespace-nowrap font-mono text-sm text-ink-900">
                          {p.confidential.symbol}
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="mr-2 text-sm text-ink-700">{p.underlying.symbol}</span>
                          <AddressTag address={p.underlying.address} />
                        </td>
                        <td className="whitespace-nowrap">
                          <AddressTag address={p.confidential.address} />
                        </td>
                        <td className="whitespace-nowrap font-mono text-sm tabular text-ink-600">
                          {p.underlying.decimals} / {p.confidential.decimals}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DocSection>

            {/* ── 10 · Development & deploy ─────────────────────────────── */}
            <DocSection id="development" index="10" title="Development & deploy">
              <H3>Local setup</H3>
              <CodeBlock
                title="terminal"
                code={`npm install
cp .env.example .env.local   # optional: public defaults ship out of the box
npm run dev                  # http://localhost:3000`}
              />
              <P>
                Requires Node 18.18+ (Next.js 14). Connect any injected wallet on
                Sepolia; you&rsquo;ll need a little Sepolia ETH for gas.
              </P>

              <H3>Scripts</H3>
              <DocTable
                head={["Command", "Purpose"]}
                mono
                rows={[
                  ["npm run dev", "Local dev server"],
                  ["npm run build", "Production build"],
                  ["npm run start", "Serve the production build"],
                  ["npm run typecheck", "tsc --noEmit"],
                  ["npm run lint", "next lint (eslint-config-next)"],
                  ["npm run format", "prettier --write"],
                  ["npm test", "Vitest unit tests"],
                ]}
              />

              <H3>Environment variables</H3>
              <P>
                Everything runs on public defaults; no configuration is required
                to try it. Override only what you need (see{" "}
                <Mono>.env.example</Mono>):
              </P>
              <DocTable
                head={["Variable", "Purpose"]}
                mono
                rows={[
                  [
                    "NEXT_PUBLIC_SEPOLIA_RPC",
                    "A keyed RPC (Alchemy/Infura/…). Recommended for any deployment; the public endpoint rate-limits under registry multicall traffic.",
                  ],
                  [
                    "NEXT_PUBLIC_REPO_URL",
                    "Your repo URL. When set, the Add-pair modal offers a one-click “Suggest on GitHub” pre-filled issue; unset, the button is hidden.",
                  ],
                ]}
              />

              <H3>Deploying</H3>
              <P>
                A standard Next.js 14 project; it deploys cleanly to Vercel or any
                Node host. One thing matters: the Zama SDK&rsquo;s WASM uses{" "}
                <Mono>SharedArrayBuffer</Mono> and worker threads for input-proof
                generation, which requires{" "}
                <strong className="font-medium text-ink-900">cross-origin isolation</strong>.
                The required{" "}
                <Mono>Cross-Origin-Opener-Policy: same-origin</Mono> and{" "}
                <Mono>Cross-Origin-Embedder-Policy: credentialless</Mono> headers
                are already configured in <Mono>next.config.mjs</Mono> and honoured
                by Vercel automatically. On other hosts, make sure those response
                headers survive.
              </P>
            </DocSection>

            {/* ── 11 · Security & trust ─────────────────────────────────── */}
            <DocSection id="security" index="11" title="Security & trust">
              <ul className="space-y-3">
                <Bullet title="Non-custodial, always.">
                  suitz never holds funds and never sees your balances. Every write
                  goes through your own wallet; every read is public onchain state.
                </Bullet>
                <Bullet title="Decryption happens in your browser.">
                  User decryption is authorized by an EIP-712 signature scoped to
                  the connected wallet and performed locally. The cleartext never
                  touches a server, suitz included.
                </Bullet>
                <Bullet title="Testnet only, no value.">
                  All tokens are official cTokenMocks on Sepolia and hold no value.
                  This is a place to learn and build, not to store anything.
                </Bullet>
                <Bullet title="No secrets, open source.">
                  The app needs no API keys to run, the injected connector needs no
                  WalletConnect project id, and the full source is MIT-licensed on
                  GitHub.
                </Bullet>
              </ul>
              <P>
                Found something off? Open an issue on{" "}
                <a
                  href="https://github.com/Dotman-Bei/suitz/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-ink-900"
                >
                  GitHub
                </a>
                .
              </P>
            </DocSection>
          </article>
        </div>
      </div>
    </div>
  );
}

/* ─── local primitives ─────────────────────────────────────────────────── */

function DocSection({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="section-head">
        <span className="section-index">{index}</span>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-2 font-display text-lg font-semibold tracking-tight">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-2xl text-[0.95rem] leading-relaxed text-ink-600">{children}</p>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[0.85em] text-ink-900">{children}</code>;
}

function Bullet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-900" />
      <span className="max-w-2xl text-[0.95rem] leading-relaxed text-ink-600">
        <strong className="font-medium text-ink-900">{title}</strong> {children}
      </span>
    </li>
  );
}

function TabCard({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="section-index">{n}</p>
      <h3 className="mt-2 font-display text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">{children}</p>
    </div>
  );
}

function Term({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-line-strong pl-4">
      <h3 className="font-display text-base font-semibold tracking-tight">{name}</h3>
      <p className="mt-1.5 max-w-2xl text-[0.95rem] leading-relaxed text-ink-600">{children}</p>
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3.5">
          <span className="step-dot mt-0.5">{i + 1}</span>
          <span className="max-w-2xl pt-1 text-[0.95rem] leading-relaxed text-ink-600">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function DocTable({
  head,
  rows,
  mono = false,
}: {
  head: [string, string];
  rows: [string, string][];
  mono?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="reg-table">
        <thead>
          <tr>
            <th>{head[0]}</th>
            <th>{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="reg-row">
              <td className={mono ? "whitespace-nowrap font-mono text-xs text-ink-900" : "text-sm font-medium text-ink-900"}>
                {k}
              </td>
              <td className="text-sm text-ink-600">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
