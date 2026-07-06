import { parseAbi } from "viem";

/**
 * ERC-20 surface we use: reads (balance/decimals/allowance), approve (for the
 * wrap flow), and the public `mint` the official cTokenMocks expose for the
 * faucet (verified onchain: selector 0x40c10f19).
 */
export const ERC20_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
]);

/**
 * ERC-7984 wrapper (OZ ConfidentialFungibleTokenERC20Wrapper), verified against
 * the deployed Sepolia proxy. `wrap` takes a PLAINTEXT amount → no client-side
 * encryption needed. euint64/externalEuint64 handles encode as bytes32 in the
 * ABI. Unwrap is async: unwrap(...) returns a request id, finalized by the
 * decryption oracle via finalizeUnwrap (wired in M5).
 */
export const WRAPPER_ABI = parseAbi([
  "function wrap(address to, uint256 amount) returns (bytes32)",
  "function unwrap(address from, address to, bytes32 encryptedAmount, bytes inputProof) returns (bytes32)",
  "function rate() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
]);
