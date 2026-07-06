import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { SEPOLIA_RPC } from "./network";

/** Shared read-only client for Sepolia (registry reads, balance handles, etc.). */
export const publicClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) });
