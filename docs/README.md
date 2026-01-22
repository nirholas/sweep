# Sweep Documentation

> **⚠️ CRITICAL: This application handles user funds. Read all documentation carefully before making any changes.**

## Table of Contents

1. [Overview](#overview)
2. [Architecture](./architecture/SYSTEM_ARCHITECTURE.md)
3. [Smart Contracts](./CONTRACTS.md)
4. [API Reference](./API.md)
5. [Security](./SECURITY.md)
6. [Deployment](./DEPLOYMENT.md)
7. [Development Guide](./DEVELOPMENT.md)

## Quick Links

| Document | Description |
|----------|-------------|
| [CONTRACTS.md](./CONTRACTS.md) | Smart contract documentation and security considerations |
| [API.md](./API.md) | Complete REST API reference |
| [SECURITY.md](./SECURITY.md) | Security model and threat mitigations |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Infrastructure and deployment guide |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Local development setup |

## Overview

Sweep is a multi-chain dust sweeper that consolidates small token balances ("dust") across EVM chains and Solana into a single valuable token or DeFi position.

### Key Features

- **Multi-Chain Support**: Ethereum, Base, Arbitrum, Polygon, BSC, Optimism, Linea, Solana
- **Gasless Transactions**: ERC-4337 account abstraction with sponsored gas
- **DeFi Integration**: Deposit swept funds directly into Aave, Yearn, Beefy, or Lido
- **Cross-Chain Bridging**: Aggregate dust across chains with Across, Stargate, Hop
- **Security First**: Multi-oracle price validation, honeypot detection, MEV protection

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Connect Wallet → 2. Scan Dust → 3. Get Quote → 4. Execute   │
│                                                                  │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │ Wallet  │───▶│ Scanner │───▶│ Quoter  │───▶│ Executor│      │
│  │ Connect │    │ (Multi- │    │ (DEX    │    │ (AA +   │      │
│  │         │    │  chain) │    │  Agg)   │    │  Permit2)│     │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
sweep/
├── contracts/           # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── PiggyBatchSwap.sol      # Batch swap execution
│   │   ├── PiggyPermit2Batcher.sol # Permit2 integration
│   │   ├── PiggyDustSweeper.sol    # Main entry point
│   │   ├── PiggyVaultRouter.sol    # DeFi vault routing
│   │   └── PiggyFeeCollector.sol   # Fee management
│   └── test/            # Foundry tests
│
├── src/                 # Backend TypeScript (Hono + Node.js)
│   ├── api/             # REST API server
│   │   ├── routes/      # API route handlers
│   │   └── middleware/  # Auth, metrics, validation
│   ├── services/        # Business logic
│   │   ├── defi/        # DeFi protocol integrations
│   │   ├── dex/         # DEX aggregator layer
│   │   ├── bridge/      # Cross-chain bridge aggregator
│   │   ├── executor/    # Transaction execution (ERC-4337)
│   │   ├── wallet/      # Wallet scanning
│   │   └── price/       # Price oracles
│   ├── db/              # Database schema (Drizzle ORM)
│   ├── config/          # Chain configurations
│   └── utils/           # Shared utilities
│
├── frontend/            # Next.js 14 frontend
│   ├── app/             # App Router pages
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Client utilities
│
├── k8s/                 # Kubernetes manifests
├── monitoring/          # Prometheus + Grafana
├── scripts/             # Deployment & maintenance
└── tests/               # Integration tests
```

## Supported Chains

| Chain | Chain ID | Native Token | Status |
|-------|----------|--------------|--------|
| Ethereum | 1 | ETH | ✅ Production |
| Base | 8453 | ETH | ✅ Production |
| Arbitrum | 42161 | ETH | ✅ Production |
| Polygon | 137 | MATIC | ✅ Production |
| BSC | 56 | BNB | ✅ Production |
| Optimism | 10 | ETH | ✅ Production |
| Linea | 59144 | ETH | ✅ Production |
| Solana | - | SOL | ✅ Production |

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Hono (lightweight, fast)
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Cache**: Redis 7
- **Queue**: BullMQ

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Wallet**: wagmi + viem
- **Styling**: Tailwind CSS

### Smart Contracts
- **Framework**: Foundry
- **Standards**: ERC-4337, Permit2, ERC-2612
- **Security**: OpenZeppelin contracts

### Infrastructure
- **Container**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana

## Getting Started

See [DEVELOPMENT.md](./DEVELOPMENT.md) for local setup instructions.

```bash
# Quick start
npm install
npm run docker:up      # Start Postgres, Redis
npm run db:migrate     # Run migrations
npm run db:seed        # Seed test data
npm run dev            # Start API server
```

## Contributing

1. Read the [Security Documentation](./SECURITY.md)
2. Follow the [Development Guide](./DEVELOPMENT.md)
3. Ensure all tests pass
4. Submit PR with detailed description

## License

MIT License - see [LICENSE](../LICENSE)
