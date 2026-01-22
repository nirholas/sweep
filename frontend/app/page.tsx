import Link from "next/link";
import { WalletConnect } from "@/components/WalletConnect";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-4xl">🧹</span>
          <span className="text-2xl font-bold text-primary">Sweep</span>
        </div>
        <WalletConnect />
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mb-8">
          <span className="text-8xl animate-bounce-gentle inline-block">🧹</span>
        </div>
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
          Sweep Your Dust
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Turn those small token balances across multiple chains into something meaningful. 
          Consolidate, swap, or stake your dust with a single click.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Launch App
          </Link>
          <a
            href="https://github.com/nirholas/sweep"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors"
          >
            View Docs
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            emoji="🔍"
            title="Scan Wallets"
            description="Connect your wallet and we'll scan for dust tokens across Ethereum, Base, Arbitrum, Polygon, and more."
          />
          <FeatureCard
            emoji="🔄"
            title="Aggregate & Swap"
            description="Select which tokens to sweep. We'll find the best routes using 1inch, Jupiter, and other aggregators."
          />
          <FeatureCard
            emoji="💰"
            title="Stake or Cash Out"
            description="Convert dust into stablecoins, stake in Aave/Lido, or consolidate into your favorite token."
          />
        </div>
      </section>

      {/* Chains Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Supported Chains</h2>
        <div className="flex flex-wrap justify-center gap-6">
          {[
            { name: "Ethereum", icon: "⟠" },
            { name: "Base", icon: "🔵" },
            { name: "Arbitrum", icon: "🔷" },
            { name: "Polygon", icon: "🟣" },
            { name: "BNB Chain", icon: "🟡" },
            { name: "Optimism", icon: "🔴" },
            { name: "Solana", icon: "◎" },
          ].map((chain) => (
            <div
              key={chain.name}
              className="flex items-center gap-2 px-6 py-3 bg-card rounded-lg border"
            >
              <span className="text-2xl">{chain.icon}</span>
              <span className="font-medium">{chain.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>🧹</span>
            <span>Sweep © 2026</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">
              Twitter
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Discord
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-card rounded-xl border hover:border-primary/50 transition-colors">
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
