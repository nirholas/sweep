import type { SupportedChain } from "../../../config/chains.js";
import {
  type ChainBalance,
  type ChainScanner,
  type WalletToken,
  type HeliusAsset,
  type HeliusGetAssetsByOwnerResponse,
  DUST_THRESHOLD_USD,
} from "../types.js";
import { getValidatedPrice } from "../../price.service.js";

/**
 * Solana Scanner
 * Uses Helius DAS API for token account discovery
 */
export class SolanaScanner implements ChainScanner {
  chain: SupportedChain = "solana";

  private getHeliusUrl(): string {
    const apiKey = process.env.HELIUS_API_KEY;
    if (!apiKey) {
      throw new Error("HELIUS_API_KEY not configured");
    }
    return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  }

  /**
   * Fetch all token accounts using Helius DAS API (getAssetsByOwner)
   */
  private async fetchTokenAccounts(address: string): Promise<HeliusAsset[]> {
    const url = this.getHeliusUrl();
    const allAssets: HeliusAsset[] = [];
    let page = 1;
    const limit = 1000;

    // Paginate through all assets
    while (true) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `assets-${page}`,
          method: "getAssetsByOwner",
          params: {
            ownerAddress: address,
            page,
            limit,
            displayOptions: {
              showFungible: true,
              showNativeBalance: true,
            },
          },
        }),
      });

      const data = await response.json() as { error?: { message: string }; result: HeliusGetAssetsByOwnerResponse };

      if (data.error) {
        throw new Error(`Helius error: ${data.error.message}`);
      }

      const result: HeliusGetAssetsByOwnerResponse = data.result;
      
      // Filter for fungible tokens only (exclude NFTs)
      const fungibleAssets = result.items.filter(
        (asset) =>
          asset.interface === "FungibleToken" ||
          asset.interface === "FungibleAsset"
      );

      allAssets.push(...fungibleAssets);

      // Check if we need to fetch more pages
      if (result.items.length < limit) {
        break;
      }
      page++;
    }

    return allAssets;
  }

  /**
   * Fetch native SOL balance
   */
  private async fetchNativeBalance(address: string): Promise<bigint> {
    const url = this.getHeliusUrl();

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "balance",
        method: "getBalance",
        params: [address],
      }),
    });

    const data = await response.json() as { error?: { message: string }; result: { value: number } };

    if (data.error) {
      throw new Error(`Helius error: ${data.error.message}`);
    }

    return BigInt(data.result.value);
  }

  /**
   * Get SOL price
   */
  private async getSolPrice(): Promise<number> {
    // Wrapped SOL address for price lookup
    const wsolAddress = "So11111111111111111111111111111111111111112";
    const priceData = await getValidatedPrice(wsolAddress, "solana");
    return priceData.price;
  }

  /**
   * Convert Helius asset to WalletToken
   */
  private async assetToToken(asset: HeliusAsset): Promise<WalletToken | null> {
    const tokenInfo = asset.token_info;
    if (!tokenInfo || tokenInfo.balance === 0) {
      return null;
    }

    const decimals = tokenInfo.decimals || 0;
    const balance = BigInt(Math.floor(tokenInfo.balance));
    const balanceFormatted = (tokenInfo.balance / Math.pow(10, decimals)).toString();

    // Use Helius price if available, otherwise fetch from price service
    let valueUsd = tokenInfo.price_info?.total_price || 0;
    
    if (valueUsd === 0) {
      try {
        const priceData = await getValidatedPrice(asset.id, "solana");
        valueUsd = parseFloat(balanceFormatted) * priceData.price;
      } catch {
        // Price not available
        valueUsd = 0;
      }
    }

    const isDust = valueUsd < DUST_THRESHOLD_USD && valueUsd > 0;

    return {
      address: asset.id,
      symbol: asset.content.metadata.symbol || "???",
      name: asset.content.metadata.name || "Unknown Token",
      decimals,
      balance: balance.toString(),
      balanceFormatted,
      valueUsd,
      isDust,
      logoUrl: asset.content.links?.image,
    };
  }

  /**
   * Main scan function - scans Solana wallet for all SPL tokens
   */
  async scan(address: string): Promise<ChainBalance> {
    // Fetch token accounts and native balance in parallel
    const [assets, nativeBalance, solPrice] = await Promise.all([
      this.fetchTokenAccounts(address),
      this.fetchNativeBalance(address),
      this.getSolPrice(),
    ]);

    // Convert assets to tokens
    const tokenPromises = assets.map((asset) => this.assetToToken(asset));
    const tokensWithNulls = await Promise.all(tokenPromises);
    
    // Filter out null tokens
    const tokens = tokensWithNulls.filter((t): t is WalletToken => t !== null);

    // Calculate native SOL value (9 decimals on Solana)
    const nativeBalanceFormatted = (Number(nativeBalance) / 1e9).toString();
    const nativeValueUsd = parseFloat(nativeBalanceFormatted) * solPrice;

    // Calculate totals
    const totalValueUsd = tokens.reduce((sum, t) => sum + t.valueUsd, 0) + nativeValueUsd;
    const dustTokens = tokens.filter((t) => t.isDust);
    const dustValueUsd = dustTokens.reduce((sum, t) => sum + t.valueUsd, 0);

    return {
      chain: "solana",
      address: address,
      tokens,
      nativeBalance: nativeBalance.toString(),
      nativeValueUsd,
      totalValueUsd,
      dustValueUsd,
      dustTokenCount: dustTokens.length,
      scannedAt: Date.now(),
    };
  }
}

// Export singleton instance
export const solanaScanner = new SolanaScanner();
