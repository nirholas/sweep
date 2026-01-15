import { http, createConfig } from "wagmi";
import { mainnet, base, arbitrum, polygon, bsc, linea } from "wagmi/chains";
import { coinbaseWallet, metaMask, walletConnect, injected } from "wagmi/connectors";

// WalletConnect project ID - get from https://cloud.walletconnect.com
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

// Coinbase Smart Wallet - enables gasless transactions
const coinbaseWalletConnector = coinbaseWallet({
  appName: "Piggy Bank",
  appLogoUrl: "https://piggybank.xyz/logo.png",
  preference: "smartWalletOnly", // Use Smart Wallet for gasless
});

// MetaMask connector
const metaMaskConnector = metaMask({
  dappMetadata: {
    name: "Piggy Bank",
    url: "https://piggybank.xyz",
    iconUrl: "https://piggybank.xyz/logo.png",
  },
});

// WalletConnect connector
const walletConnectConnector = walletConnect({
  projectId: walletConnectProjectId,
  metadata: {
    name: "Piggy Bank",
    description: "Sweep dust tokens across chains",
    url: "https://piggybank.xyz",
    icons: ["https://piggybank.xyz/logo.png"],
  },
});

// Injected wallet connector (browser extensions)
const injectedConnector = injected();

// Wagmi config
export const config = createConfig({
  chains: [mainnet, base, arbitrum, polygon, bsc, linea],
  connectors: [
    coinbaseWalletConnector,
    metaMaskConnector,
    walletConnectConnector,
    injectedConnector,
  ],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_ETH_RPC || "https://eth.llamarpc.com"),
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC || "https://base.llamarpc.com"),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARB_RPC || "https://arb1.arbitrum.io/rpc"),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC || "https://polygon.llamarpc.com"),
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC || "https://bsc-dataseed.binance.org"),
    [linea.id]: http(process.env.NEXT_PUBLIC_LINEA_RPC || "https://rpc.linea.build"),
  },
  ssr: true,
});

// Also export as wagmiConfig for backwards compatibility
export const wagmiConfig = config;

// Export chain list for UI
export const supportedChains = [mainnet, base, arbitrum, polygon, bsc, linea];

// Chain IDs enum for type safety
export const ChainIds = {
  MAINNET: 1,
  BASE: 8453,
  ARBITRUM: 42161,
  POLYGON: 137,
  BSC: 56,
  LINEA: 59144,
} as const;

export type SupportedChainId = (typeof ChainIds)[keyof typeof ChainIds];

// Utility to check if chain is supported
export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return Object.values(ChainIds).includes(chainId as SupportedChainId);
}
