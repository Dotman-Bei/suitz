import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ExternalLink } from "@/components/ui/Icons";

const resources = [
  { label: "GitHub repository", href: "https://github.com" },
  { label: "README & docs", href: "/#docs" },
  { label: "Zama FHEVM docs", href: "https://docs.zama.ai" },
  { label: "Wrappers Registry", href: "https://docs.zama.ai" },
];

export function Footer() {
  return (
    <footer className="on-dark relative overflow-hidden border-t border-ink-800 bg-ink-900 text-paper">
      {/* textured backdrop the glass frosts over */}
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-60" />
      <div className="pointer-events-none absolute -right-16 -top-16 select-none font-display text-[22rem] font-bold leading-none hollow opacity-[0.06]">
        z
      </div>

      <div className="shell relative py-16">
        {/* glass panel */}
        <div className="glass-dark grid gap-12 rounded-2xl p-8 sm:p-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo tone="paper" className="text-2xl" />
            <p className="mt-4 text-sm leading-relaxed text-ink-300">
              The canonical home for Zama ERC-20 ↔ ERC-7984 wrapper pairs. Find a
              pair, wrap it, decrypt it, unwrap it.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="badge border-ink-700 bg-ink-800/70 text-ink-300">Sepolia</span>
              <span className="badge border-ink-700 bg-ink-800/70 text-ink-300">FHEVM</span>
              <span className="badge border-ink-700 bg-ink-800/70 text-ink-300">EIP-712</span>
            </div>
          </div>

          <nav>
            <h3 className="mono-label text-ink-400">Resources</h3>
            <ul className="mt-4 space-y-3">
              {resources.map((r) => (
                <li key={r.label}>
                  <a
                    href={r.href}
                    target={r.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="group inline-flex items-center gap-1.5 text-sm text-ink-200 transition hover:text-paper"
                  >
                    {r.label}
                    <ExternalLink
                      width={13}
                      height={13}
                      className="text-ink-500 transition group-hover:text-paper"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="mono-label text-ink-400">Testnet notice</h3>
            <p className="mt-4 text-sm leading-relaxed text-ink-300">
              All tokens are official cTokenMocks on Sepolia and hold no value.
              Decryption reveals balances only to the connected wallet via an
              EIP-712 signature, never to suitz.
            </p>
            <Link
              href="/console"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-paper underline-offset-4 hover:underline"
            >
              Open the console →
            </Link>
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-8 flex flex-col items-start justify-between gap-3 text-2xs text-ink-400 sm:flex-row sm:items-center">
          <span className="font-mono uppercase tracking-[0.14em]">
            Built for the Zama Developer Program · Season 3
          </span>
          <span className="font-mono">© {new Date().getFullYear()} suitz</span>
        </div>
      </div>
    </footer>
  );
}
