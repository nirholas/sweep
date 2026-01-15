import type { SupportedChain } from "../../../config/chains.js";
import {
  type DexQuote,
  type QuoteRequest,
  type IDexAggregator,
  SOL_NATIVE_MINT,
  DEFAULT_SLIPPAGE,
  DEFAULT_QUOTE_EXPIRY_SECONDS,
} from "../types.js";

const JUPITER_API_BASE = "https://quote-api.jup.ag/v6";

interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: "ExactIn" | "ExactOut";
  slippageBps: number;
  platformFee: null | {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

interface JupiterSwapResponse {
  swapTransaction: string; // Base64 encoded versioned transaction
  lastValidBlockHeight: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
  prioritizationFeeLamportsEstimate?: {
    min: number;
    median: number;
    max: number;
  };
}

interface JupiterTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  daily_volume?: number;
}

export class JupiterAggregator implements IDexAggregator {
  name: "jupiter" = "jupiter";
  supportedChains: SupportedChain[] = ["solana"];

  // Cache for token info
  private tokenCache: Map<string, JupiterTokenInfo> = new Map();

  isAvailable(chain: SupportedChain): boolean {
    return chain === "solana";
  }

  async getQuote(request: QuoteRequest): Promise<DexQuote | null> {
    if (!this.isAvailable(request.chain)) {
      return null;
    }

    const slippage = request.slippage ?? DEFAULT_SLIPPAGE;
    const slippageBps = Math.floor(slippage * 100); // Convert percentage to basis points

    try {
      // Handle native SOL (use wrapped SOL mint)
      const inputMint = this.normalizeTokenAddress(request.inputToken);
      const outputMint = this.normalizeTokenAddress(request.outputToken);

      // Get quote from Jupiter
      const quoteResponse = await this.getJupiterQuote(
        inputMint,
        outputMint,
        request.inputAmount,
        slippageBps
      );

      if (!quoteResponse) {
        return null;
      }

      // Get token info for better response
      const [inputTokenInfo, outputTokenInfo] = await Promise.all([
        this.getTokenInfo(inputMint),
        this.getTokenInfo(outputMint),
      ]);

      const quote: DexQuote = {
        aggregator: "jupiter",
        inputToken: {
          address: quoteResponse.inputMint,
          symbol: inputTokenInfo?.symbol || "UNKNOWN",
          decimals: inputTokenInfo?.decimals || 9,
        },
        outputToken: {
          address: quoteResponse.outputMint,
          symbol: outputTokenInfo?.symbol || "UNKNOWN",
          decimals: outputTokenInfo?.decimals || 9,
        },
        inputAmount: quoteResponse.inAmount,
        outputAmount: quoteResponse.outAmount,
        priceImpact: parseFloat(quoteResponse.priceImpactPct) * 100, // Convert to percentage
        estimatedGas: "5000", // ~5000 lamports base fee on Solana
        estimatedGasUsd: 0.001, // Solana gas is very cheap
        slippage,
        expiresAt: Math.floor(Date.now() / 1000) + DEFAULT_QUOTE_EXPIRY_SECONDS,
        route: quoteResponse.routePlan,
        metadata: {
          quoteResponse,
          contextSlot: quoteResponse.contextSlot,
          otherAmountThreshold: quoteResponse.otherAmountThreshold,
        },
      };

      // Get swap transaction if requested
      if (request.includeCalldata) {
        const swapResponse = await this.getSwapTransaction(
          quoteResponse,
          request.userAddress
        );

        if (swapResponse) {
          quote.calldata = swapResponse.swapTransaction;
          quote.metadata = {
            ...quote.metadata,
            lastValidBlockHeight: swapResponse.lastValidBlockHeight,
            prioritizationFeeLamports: swapResponse.prioritizationFeeLamports,
            computeUnitLimit: swapResponse.computeUnitLimit,
          };
        }
      }

      return quote;
    } catch (error) {
      console.error("Jupiter quote error:", error);
      return null;
    }
  }

  private async getJupiterQuote(
    inputMint: string,
    outputMint: string,
    amount: string,
    slippageBps: number
  ): Promise<JupiterQuoteResponse | null> {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps: slippageBps.toString(),
      onlyDirectRoutes: "false",
      asLegacyTransaction: "false",
      maxAccounts: "64", // Optimize for versioned transactions
    });

    const response = await fetch(`${JUPITER_API_BASE}/quote?${params}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Jupiter quote API error:", error);
      return null;
    }

    return response.json();
  }

  private async getSwapTransaction(
    quoteResponse: JupiterQuoteResponse,
    userPublicKey: string
  ): Promise<JupiterSwapResponse | null> {
    const response = await fetch(`${JUPITER_API_BASE}/swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true, // Auto wrap/unwrap SOL
        dynamicComputeUnitLimit: true, // Optimize compute units
        prioritizationFeeLamports: "auto", // Auto priority fee
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Jupiter swap API error:", error);
      return null;
    }

    return response.json();
  }

  private async getTokenInfo(mint: string): Promise<JupiterTokenInfo | null> {
    // Check cache first
    if (this.tokenCache.has(mint)) {
      return this.tokenCache.get(mint)!;
    }

    try {
      const response = await fetch(
        `https://tokens.jup.ag/token/${mint}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const tokenInfo: JupiterTokenInfo = await response.json();
      this.tokenCache.set(mint, tokenInfo);
      return tokenInfo;
    } catch {
      return null;
    }
  }

  private normalizeTokenAddress(address: string): string {
    // Handle common Solana native token representations
    const lowerAddress = address.toLowerCase();
    if (
      lowerAddress === "sol" ||
      lowerAddress === "native" ||
      address === "11111111111111111111111111111111" // System program
    ) {
      return SOL_NATIVE_MINT;
    }
    return address;
  }

  async buildCalldata(quote: DexQuote): Promise<string> {
    if (quote.calldata) {
      return quote.calldata;
    }
    throw new Error(
      "Calldata not available - request quote with includeCalldata: true"
    );
  }

  // Helper to get all tradeable tokens on Jupiter
  async getTradableTokens(): Promise<JupiterTokenInfo[]> {
    try {
      const response = await fetch("https://tokens.jup.ag/tokens?tags=verified", {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return [];
      }

      return response.json();
    } catch {
      return [];
    }
  }
}

export const jupiterAggregator = new JupiterAggregator();
