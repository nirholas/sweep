"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Header } from "@/components/Header";
import { WalletConnect } from "@/components/WalletConnect";
import { useDefiPositions, type DefiPosition } from "@/hooks/useDefiPositions";
import { SUPPORTED_CHAINS } from "@/lib/chains";

export default function DeFiPage() {
  const { isConnected } = useAccount();
  const { data: positions, isLoading, error, refetch } = useDefiPositions();
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-background/80">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="mb-8">
            <span className="text-8xl">📈</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">DeFi Positions</h1>
          <p className="text-muted-foreground mb-8">
            Connect your wallet to view your DeFi positions.
          </p>
          <WalletConnect />
        </div>
      </main>
    );
  }

  // Calculate totals
  const totalValue = positions?.reduce((sum: number, p: DefiPosition) => sum + p.valueUsd, 0) ?? 0;
  const totalYield = positions?.reduce((sum: number, p: DefiPosition) => sum + (p.pendingRewards || 0), 0) ?? 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">DeFi Positions</h1>
              <p className="text-muted-foreground">
                Track and manage your yield-bearing positions
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Refresh
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card rounded-xl border p-6">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-primary">
                ${totalValue.toFixed(2)}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <p className="text-sm text-muted-foreground">Pending Rewards</p>
              <p className="text-2xl font-bold text-green-500">
                ${totalYield.toFixed(2)}
              </p>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <p className="text-sm text-muted-foreground">Active Positions</p>
              <p className="text-2xl font-bold">{positions?.length ?? 0}</p>
            </div>
          </div>

          {/* Positions List */}
          <div className="bg-card rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-4">Your Positions</h2>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-2">Failed to load positions</p>
                <p className="text-sm text-muted-foreground">{error.message}</p>
              </div>
            ) : positions && positions.length > 0 ? (
              <div className="space-y-3">
                {positions.map((position: DefiPosition) => (
                  <PositionCard
                    key={position.id}
                    position={position}
                    isSelected={selectedPosition === position.id}
                    onSelect={() =>
                      setSelectedPosition(
                        selectedPosition === position.id ? null : position.id
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-2">🌱</p>
                <p className="text-muted-foreground">No DeFi positions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sweep your dust tokens into DeFi to start earning yield
                </p>
              </div>
            )}
          </div>

          {/* Available Vaults */}
          <div className="bg-card rounded-xl border p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Popular Yield Vaults</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {POPULAR_VAULTS.map((vault) => (
                <div
                  key={vault.id}
                  className="p-4 bg-background rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{vault.protocol}</span>
                    <span className="text-green-500 font-semibold">
                      {vault.apy}% APY
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{vault.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function PositionCard({
  position,
  isSelected,
  onSelect,
}: {
  position: DefiPosition;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === position.chainId);

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? "bg-primary/5 border-primary"
          : "bg-background border-border hover:border-primary/50"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Protocol Icon */}
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">
          {position.protocol === "Aave" && "🏦"}
          {position.protocol === "Lido" && "🌊"}
          {position.protocol === "Compound" && "🏛️"}
          {position.protocol === "Yearn" && "🔷"}
          {!["Aave", "Lido", "Compound", "Yearn"].includes(position.protocol) && "📈"}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{position.protocol}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{position.asset}</span>
            <span className="text-xs px-2 py-0.5 bg-muted rounded">
              {chain?.icon} {chain?.name}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            APY: <span className="text-green-500">{position.apy.toFixed(2)}%</span>
          </p>
        </div>

        {/* Value */}
        <div className="text-right">
          <p className="font-semibold">${position.valueUsd.toFixed(2)}</p>
          {position.pendingRewards && position.pendingRewards > 0 && (
            <p className="text-sm text-green-500">
              +${position.pendingRewards.toFixed(4)} pending
            </p>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isSelected && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Deposited</p>
              <p className="font-medium">
                {position.balance} {position.asset}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Current Value</p>
              <p className="font-medium">${position.valueUsd.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Entry Date</p>
              <p className="font-medium">
                {new Date(position.entryDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Earned</p>
              <p className="font-medium text-green-500">
                ${((position.earnedTotal || 0)).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80">
              Deposit More
            </button>
            <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">
              Withdraw
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Mock popular vaults
const POPULAR_VAULTS = [
  { id: "aave-usdc", protocol: "Aave", name: "USDC Supply", apy: 4.5 },
  { id: "lido-steth", protocol: "Lido", name: "Staked ETH", apy: 3.8 },
  { id: "compound-usdt", protocol: "Compound", name: "USDT Supply", apy: 3.2 },
  { id: "yearn-dai", protocol: "Yearn", name: "DAI Vault", apy: 5.5 },
];
