// Token types
export interface DustToken {
  id: string;
  chainId: number;
  chain: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
  priceUsd: number;
  valueUsd: number;
  balanceUsd: number; // Alias for valueUsd for backwards compatibility
  isVerified: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  logoUrl?: string;
  isSpam?: boolean;
  riskScore?: number;
}

// Chain types
export interface Chain {
  id: number;
  name: string;
  icon: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
  rpcUrl: string;
}

// Quote types
export interface SweepQuote {
  id: string;
  inputTokens: SweepInputToken[];
  outputToken: OutputToken;
  totalInputUsd: number;
  estimatedOutput: string;
  estimatedOutputUsd: number;
  priceImpact: number;
  fees: SweepFees;
  routes: SwapRoute[];
  expiresAt: number;
  gasless: boolean;
}

export interface SweepInputToken {
  address: string;
  symbol: string;
  chainId: number;
  balance: string;
  balanceUsd: number;
  estimatedOutput: string;
}

export interface OutputToken {
  address: string;
  symbol: string;
  chainId: number;
  decimals: number;
  logoUrl?: string;
}

export interface SweepFees {
  protocol: number;
  gas: number;
  bridge?: number;
  total: number;
}

export interface SwapRoute {
  chainId: number;
  dex: string;
  path: string[];
  expectedOutput: string;
  priceImpact: number;
}

// Execution types
export interface ExecuteSweepRequest {
  quoteId: string;
  wallet: string;
  signature: string;
  message: string;
}

export interface ExecuteSweepResponse {
  success: boolean;
  sweepId: string;
  error?: string;
}

// Status types
export interface SweepStatus {
  id: string;
  status: "pending" | "submitted" | "confirmed" | "failed";
  wallet?: string;
  tokensSwept?: number;
  outputToken?: string;
  outputAmount?: string;
  gasSaved?: number;
  transactions?: TransactionInfo[];
  chainStatuses?: Record<string, ChainStatus>;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TransactionInfo {
  chainId: number;
  hash: string;
  status: "pending" | "submitted" | "confirmed" | "failed";
}

export interface ChainStatus {
  status: "pending" | "submitted" | "confirmed" | "failed";
  txHash?: string;
  tokensSwept?: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WalletTokensResponse {
  tokens: DustToken[];
  totalValueUsd: number;
  chainBreakdown: Record<number, { count: number; valueUsd: number }>;
}

export interface QuoteResponse {
  quote: SweepQuote;
}

// Settings types
export interface SweepSettings {
  minDustValue: number;
  maxDustValue: number;
  outputToken: string;
  slippage: number;
  includeSpam: boolean;
}

export const DEFAULT_SETTINGS: SweepSettings = {
  minDustValue: 0.1,
  maxDustValue: 100,
  outputToken: "ETH",
  slippage: 0.5,
  includeSpam: false,
};

// Supported output tokens
export interface OutputTokenOption {
  address: string;
  symbol: string;
  name: string;
  chainId: number;
  logoUrl: string;
}

export const OUTPUT_TOKEN_OPTIONS: OutputTokenOption[] = [
  {
    address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    symbol: "ETH",
    name: "Ethereum",
    chainId: 1,
    logoUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  },
  {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    name: "USD Coin",
    chainId: 1,
    logoUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
  },
  {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    symbol: "USDT",
    name: "Tether USD",
    chainId: 1,
    logoUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  },
  {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    chainId: 1,
    logoUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
  },
];
