"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { connectors, connect, isPending } = useConnect();

  // Get the injected connector (MetaMask, etc.)
  const injectedConnector = connectors.find((c) => c.id === "injected");
  const coinbaseConnector = connectors.find((c) => c.id === "coinbaseWalletSDK");

  return (
    <div className="flex items-center gap-3">
      {/* Clerk Auth */}
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
            Sign In
          </button>
        </SignInButton>
      </SignedOut>
      
      <SignedIn>
        {/* Wallet Connection */}
        {isConnected && address ? (
          <div className="flex items-center gap-3">
            {chain && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-sm">
                <span>{getChainIcon(chain.id)}</span>
                <span className="hidden sm:inline">{chain.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-mono text-sm">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Disconnect wallet"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {injectedConnector && (
              <button
                onClick={() => connect({ connector: injectedConnector })}
                disabled={isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? "..." : "🦊 MetaMask"}
              </button>
            )}
            {coinbaseConnector && (
              <button
                onClick={() => connect({ connector: coinbaseConnector })}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isPending ? "..." : "🔵 Coinbase"}
              </button>
            )}
          </div>
        )}
        
        {/* Clerk User Button */}
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-9 h-9",
            },
          }}
        />
      </SignedIn>
    </div>
  );
}

function getChainIcon(chainId: number): string {
  const icons: Record<number, string> = {
    1: "⟠",
    8453: "🔵",
    42161: "🔷",
    137: "🟣",
    56: "🟡",
    10: "🔴",
    59144: "◇",
  };
  return icons[chainId] || "🔗";
}
