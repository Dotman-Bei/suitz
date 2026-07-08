/**
 * Real token logos, mapped by *base* symbol. Assets live in /public/tokens —
 * sources: cryptocurrency-icons (MIT), the Trust Wallet assets repo (WETH,
 * XAUt), Zama's public GitHub avatar, Bron's official site favicon, and
 * Steakhouse Financial's steakUSDC mark.
 * Sepolia mocks can't be keyed by contract address — icon CDNs index mainnet
 * addresses — so we normalize the symbol instead: cUSDCMock → USDCMock → usdc.
 * Anything unmapped (arbitrary local pairs) falls back to the monogram in
 * TokenGlyph.
 */
const ICONS: Record<string, string> = {
  usdc: "/tokens/usdc.svg",
  usdt: "/tokens/usdt.svg",
  eth: "/tokens/eth.svg",
  weth: "/tokens/weth.png",
  xaut: "/tokens/xaut.png",
  zama: "/tokens/zama.png",
  bron: "/tokens/bron.svg",
  steakcusdc: "/tokens/steakUSDC.png",
};

/** cUSDCMock / USDCMock / cUSDC / USDC → "/tokens/usdc.svg" (or undefined). */
export function tokenIcon(symbol: string): string | undefined {
  const base = symbol
    .replace(/^c(?=[A-Z0-9])/, "") // confidential prefix: cUSDC → USDC (keeps tGBP intact)
    .replace(/\s*\(mock\)$/i, "") // parenthesized suffix: "csteakcUSDC (Mock)" → csteakcUSDC
    .replace(/mock$/i, "") // testnet suffix: USDCMock → USDC
    .toLowerCase();
  // A confidential prefix on a lowercase-leading symbol (ctGBP) survives the
  // case-sensitive strip above — retry without it.
  return ICONS[base] ?? (base.startsWith("c") ? ICONS[base.slice(1)] : undefined);
}
