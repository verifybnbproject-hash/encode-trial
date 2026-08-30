// Smart Contract Configuration
export const CONTRACT_CONFIG = {
  // USDT Contract on BSC Mainnet (BEP-20)
  USDT_ADDRESS: "0x55d398326f99059fF775485246999027B3197955",

  // Asset Verifier Contract (Deploy this contract to BSC)
  VERIFIER_ADDRESS: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7", // Replace with actual deployed address

  // Verification fee in USDT (with 18 decimals) - 10 USDT
  VERIFICATION_FEE: "10000000000000000000", // 10 USDT
  VERIFICATION_FEE_DISPLAY: "10", // For display purposes

  // USDT Token Details
  USDT_DECIMALS: 18,
  USDT_SYMBOL: "USDT",
  USDT_NAME: "Tether USD (BEP-20)",
}

// USDT BEP-20 specific ABI
export const USDT_ABI = [
  {
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
]

// Asset Verifier Contract ABI
export const VERIFIER_ABI = [
  {
    inputs: [],
    name: "verifyAssets",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "isVerified",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getVerificationDetails",
    outputs: [
      { name: "", type: "bool" },
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "verificationFee",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "AssetVerified",
    type: "event",
  },
]
