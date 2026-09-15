import { defineChain } from "viem";

// Chiliz Spicy testnet. Not in viem's built-in chain list, so it's defined
// here to match contracts/hardhat.config.js.
export const chilizSpicy = defineChain({
  id: 88882,
  name: "Chiliz Spicy Testnet",
  nativeCurrency: { name: "Chiliz", symbol: "CHZ", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_SPICY_RPC_URL || "https://spicy-rpc.chiliz.com"] },
  },
  blockExplorers: {
    default: { name: "ChilizScan", url: "https://testnet.chiliscan.com" },
  },
  testnet: true,
});

export const chilizMainnet = defineChain({
  id: 88888,
  name: "Chiliz Chain",
  nativeCurrency: { name: "Chiliz", symbol: "CHZ", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_CHILIZ_RPC_URL || "https://rpc.ankr.com/chiliz"] },
  },
  blockExplorers: {
    default: { name: "ChilizScan", url: "https://chiliscan.com" },
  },
});
