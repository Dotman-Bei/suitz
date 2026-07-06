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
 * ABI.
 *
 * Unwrap is a TWO-STEP async flow and BOTH steps are the dApp's responsibility
 * (there is no auto-relayer for this contract — see the onchain history where
 * every finalize tx is sent by the token recipient themselves):
 *
 *   1. unwrap(from, to, encAmount, proof) — burns the ERC-7984 and emits
 *      `UnwrapRequested` carrying the euint64 `handle` of the transferable
 *      amount, which is queued for public decryption.
 *   2. finalizeUnwrap(handle, amount, signatures) — releases the ERC-20. The
 *      `amount` (uint64 cleartext) + `signatures` (KMS proof) come from the
 *      relayer SDK's publicDecrypt(handle). WITHOUT this call the burned
 *      balance is never converted back and the ERC-20 never arrives.
 */
export const WRAPPER_ABI = parseAbi([
  "function wrap(address to, uint256 amount) returns (bytes32)",
  "function unwrap(address from, address to, bytes32 encryptedAmount, bytes inputProof) returns (bytes32)",
  "function finalizeUnwrap(bytes32 handle, uint64 amount, bytes signatures)",
  "function rate() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
  "event UnwrapRequested(address indexed to, bytes32 indexed requestId, bytes32 handle)",
]);
