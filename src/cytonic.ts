import { defineChain } from "viem"

export const cytonic = defineChain({
  id: 52226,
  name: "Cytonic",
  rpc: "http://rpc.evm.testnet.cytonic.com",
  nativeCurrency: {
    name: "Cytonic",
    symbol: "CYT",
    decimals: 18,
  },
  blockExplorers: {

      default: {
        name: "Cytonic Explorer",
        url: "https://explorer.cytonic.network",
      },
  }
});