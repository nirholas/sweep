import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  numeric,
  decimal,
  boolean,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// Users Table
// ============================================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletAddress: varchar("wallet_address", { length: 66 }).notNull().unique(),
    smartWalletAddress: varchar("smart_wallet_address", { length: 66 }),
    nonce: varchar("nonce", { length: 64 }), // For SIWE auth
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    lastActive: timestamp("last_active", { withTimezone: true }),
    settings: jsonb("settings").default({}),
  },
  (table) => ({
    walletIdx: index("idx_users_wallet").on(table.walletAddress),
    smartWalletIdx: index("idx_users_smart_wallet").on(table.smartWalletAddress),
  })
);

// ============================================================
// Tokens Table (whitelist/blacklist registry)
// ============================================================
export const tokens = pgTable(
  "tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    address: varchar("address", { length: 66 }).notNull(),
    chain: varchar("chain", { length: 20 }).notNull(),
    symbol: varchar("symbol", { length: 30 }),
    tokenName: varchar("token_name", { length: 100 }),
    decimals: numeric("decimals"),
    isWhitelisted: boolean("is_whitelisted").default(false),
    isBlacklisted: boolean("is_blacklisted").default(false),
    listReason: text("list_reason"),
    logoUri: varchar("logo_uri", { length: 500 }),
    coingeckoId: varchar("coingecko_id", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    addressChainIdx: uniqueIndex("idx_tokens_address_chain").on(table.address, table.chain),
    whitelistIdx: index("idx_tokens_whitelist").on(table.isWhitelisted),
    blacklistIdx: index("idx_tokens_blacklist").on(table.isBlacklisted),
  })
);

// ============================================================
// Sweeps Table
// ============================================================
export const sweeps = pgTable(
  "sweeps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    status: varchar("status", { length: 30 })
      .default("pending")
      .notNull()
      .$type<"pending" | "quoting" | "signing" | "submitted" | "confirmed" | "failed" | "cancelled">(),
    chains: jsonb("chains").$type<string[]>().default([]),
    tokens: jsonb("tokens").$type<{
      address: string;
      chain: string;
      symbol: string;
      amount: string;
      usdValue: number;
    }[]>().default([]),
    quote: jsonb("quote").$type<{
      quoteId: string;
      outputToken: string;
      outputAmount: string;
      estimatedGas: string;
      netValueUsd: number;
      aggregator: string;
      expiresAt: number;
    }>(),
    txHashes: jsonb("tx_hashes").$type<Record<string, string>>().default({}),
    userOpHashes: jsonb("user_op_hashes").$type<Record<string, string>>().default({}),
    outputToken: varchar("output_token", { length: 66 }),
    outputAmount: numeric("output_amount", { precision: 78, scale: 0 }),
    outputChain: varchar("output_chain", { length: 20 }),
    gasToken: varchar("gas_token", { length: 66 }),
    gasPaid: numeric("gas_paid", { precision: 78, scale: 0 }),
    totalInputValueUsd: decimal("total_input_value_usd", { precision: 20, scale: 8 }),
    totalOutputValueUsd: decimal("total_output_value_usd", { precision: 20, scale: 8 }),
    feePaid: decimal("fee_paid", { precision: 20, scale: 8 }),
    defiDestination: varchar("defi_destination", { length: 66 }),
    defiProtocol: varchar("defi_protocol", { length: 50 }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    userIdx: index("idx_sweeps_user").on(table.userId),
    statusIdx: index("idx_sweeps_status").on(table.status),
    createdIdx: index("idx_sweeps_created").on(table.createdAt),
  })
);

// ============================================================
// Sweep Quotes Table (temporary quote storage)
// ============================================================
export const sweepQuotes = pgTable(
  "sweep_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
    chains: jsonb("chains").$type<string[]>().default([]),
    tokens: jsonb("tokens").$type<{
      address: string;
      chain: string;
      symbol: string;
      amount: string;
      usdValue: number;
    }[]>().default([]),
    destination: jsonb("destination").$type<{
      chain: string;
      token: string;
      protocol?: string;
      vault?: string;
    }>(),
    outputToken: varchar("output_token", { length: 66 }),
    outputAmount: numeric("output_amount", { precision: 78, scale: 0 }),
    estimatedGasUsd: decimal("estimated_gas_usd", { precision: 20, scale: 8 }),
    netValueUsd: decimal("net_value_usd", { precision: 20, scale: 8 }),
    aggregator: varchar("aggregator", { length: 50 }),
    routeData: jsonb("route_data"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_quotes_user").on(table.userId),
    walletIdx: index("idx_quotes_wallet").on(table.walletAddress),
    expiresIdx: index("idx_quotes_expires").on(table.expiresAt),
  })
);

// ============================================================
// Dust Tokens Table (scanned wallet balances)
// ============================================================
export const dustTokens = pgTable(
  "dust_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
    chain: varchar("chain", { length: 20 }).notNull(),
    tokenAddress: varchar("token_address", { length: 66 }).notNull(),
    symbol: varchar("symbol", { length: 30 }),
    tokenName: varchar("token_name", { length: 100 }),
    decimals: numeric("decimals"),
    balance: numeric("balance", { precision: 78, scale: 0 }).notNull(),
    valueUsd: decimal("value_usd", { precision: 20, scale: 8 }),
    priceUsd: decimal("price_usd", { precision: 30, scale: 18 }),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow(),
    swept: boolean("swept").default(false),
    sweepId: uuid("sweep_id").references(() => sweeps.id),
  },
  (table) => ({
    uniqueIdx: uniqueIndex("idx_dust_unique").on(table.userId, table.chain, table.tokenAddress),
    userIdx: index("idx_dust_user").on(table.userId),
    walletIdx: index("idx_dust_wallet").on(table.walletAddress),
  })
);

// ============================================================
// Price Cache Table
// ============================================================
export const priceCache = pgTable(
  "price_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenAddress: varchar("token_address", { length: 66 }).notNull(),
    chain: varchar("chain", { length: 20 }).notNull(),
    priceUsd: decimal("price_usd", { precision: 30, scale: 18 }),
    confidence: varchar("confidence", { length: 20 }).$type<"HIGH" | "MEDIUM" | "LOW" | "UNTRUSTED">(),
    sources: jsonb("sources").$type<{ name: string; price: number; timestamp: number }[]>(),
    liquidityUsd: decimal("liquidity_usd", { precision: 20, scale: 8 }),
    volume24h: decimal("volume_24h", { precision: 20, scale: 8 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tokenChainIdx: uniqueIndex("idx_price_token_chain").on(table.tokenAddress, table.chain),
    updatedIdx: index("idx_price_updated").on(table.updatedAt),
  })
);

// ============================================================
// Relations
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  sweeps: many(sweeps),
  dustTokens: many(dustTokens),
  quotes: many(sweepQuotes),
}));

export const sweepsRelations = relations(sweeps, ({ one, many }) => ({
  user: one(users, {
    fields: [sweeps.userId],
    references: [users.id],
  }),
  dustTokens: many(dustTokens),
}));

export const dustTokensRelations = relations(dustTokens, ({ one }) => ({
  user: one(users, {
    fields: [dustTokens.userId],
    references: [users.id],
  }),
  sweep: one(sweeps, {
    fields: [dustTokens.sweepId],
    references: [sweeps.id],
  }),
}));

export const sweepQuotesRelations = relations(sweepQuotes, ({ one }) => ({
  user: one(users, {
    fields: [sweepQuotes.userId],
    references: [users.id],
  }),
}));

// ============================================================
// Types
// ============================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;

export type Sweep = typeof sweeps.$inferSelect;
export type NewSweep = typeof sweeps.$inferInsert;

export type SweepQuote = typeof sweepQuotes.$inferSelect;
export type NewSweepQuote = typeof sweepQuotes.$inferInsert;

export type DustToken = typeof dustTokens.$inferSelect;
export type NewDustToken = typeof dustTokens.$inferInsert;

export type PriceCache = typeof priceCache.$inferSelect;
export type NewPriceCache = typeof priceCache.$inferInsert;
