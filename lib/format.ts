import type { Address } from "./types";

/** 0x1234…cdef — keeps the checksum-ish head and tail. */
export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/** Group a plain integer/decimal string with thin separators. */
export function groupNumber(value: string): string {
  const [int, frac] = value.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

/** Crude but loud address validation for the "Decrypt Any" paste flow. */
export function isAddressLike(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

/**
 * Deterministic ciphertext-looking string for a handle, so the encrypted
 * state reads like real FHE output rather than lorem filler.
 */
export function fakeCiphertext(seed: string, len = 18): string {
  const alphabet = "0123456789abcdef";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let out = "0x";
  for (let i = 0; i < len; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out += alphabet[h % 16];
  }
  return out;
}

export function blockExplorer(addr: string): string {
  return `https://sepolia.etherscan.io/address/${addr}`;
}

export function txExplorer(hash: string): string {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}
