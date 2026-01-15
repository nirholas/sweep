import { Queue, QueueEvents } from "bullmq";
import type { Job } from "bullmq";
import type { BridgeProvider } from "../services/bridge/types.js";

// Queue names
export const QUEUE_NAMES = {
  WALLET_SCAN: "wallet-scan",
  PRICE_UPDATE: "price-update",
  SWEEP_EXECUTE: "sweep-execute",
  SWEEP_TRACK: "sweep-track",
  BRIDGE_EXECUTE: "bridge-execute",
  BRIDGE_TRACK: "bridge-track",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Job data types
export interface WalletScanJobData {
  userId: string;
  walletAddress: string;
  chains: string[];
  dustThreshold?: number;
}

export interface PriceUpdateJobData {
  tokenAddress: string;
  chain: string;
  force?: boolean;
}

export interface SweepExecuteJobData {
  userId: string;
  sweepId: string;
  quoteId: string;
  walletAddress: string;
  signature: string;
  tokens: {
    address: string;
    chain: string;
    amount: string;
  }[];
  outputToken: string;
  outputChain: string;
  gasToken?: string;
}

export interface SweepTrackJobData {
  sweepId: string;
  txHash: string;
  chain: string;
  userOpHash?: string;
}

export interface BridgeExecuteJobData {
  planId: string;
  userId: string;
  walletAddress: string;
  signature: string;
  bridges: {
    sourceChain: string;
    destinationChain: string;
    quoteId: string;
    token: string;
    amount: string;
  }[];
}

export interface BridgeTrackJobData {
  planId: string;
  bridgeId: string;
  sourceTxHash: string;
  sourceChain: string;
  destinationChain: string;
  provider: BridgeProvider;
}

// Queue instances (lazily initialized)
let queues: Record<QueueName, Queue> | null = null;
let queueEvents: Record<QueueName, QueueEvents> | null = null;

// Default queue options
const defaultQueueOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600, // 7 days
    },
  },
};

/**
 * Get Redis connection URL for BullMQ
 */
function getRedisUrl(): string {
  return process.env.REDIS_URL || "redis://localhost:6379";
}

/**
 * Get or create queue instances
 */
export function getQueues(): Record<QueueName, Queue> {
  if (!queues) {
    // BullMQ prefers URL-based connection to avoid ioredis version mismatch
    const connection = { url: getRedisUrl() };

    queues = {
      [QUEUE_NAMES.WALLET_SCAN]: new Queue(QUEUE_NAMES.WALLET_SCAN, {
        connection,
        ...defaultQueueOptions,
      }),
      [QUEUE_NAMES.PRICE_UPDATE]: new Queue(QUEUE_NAMES.PRICE_UPDATE, {
        connection,
        ...defaultQueueOptions,
      }),
      [QUEUE_NAMES.SWEEP_EXECUTE]: new Queue(QUEUE_NAMES.SWEEP_EXECUTE, {
        connection,
        ...defaultQueueOptions,
        defaultJobOptions: {
          ...defaultQueueOptions.defaultJobOptions,
          attempts: 5, // More retries for sweep execution
        },
      }),
      [QUEUE_NAMES.SWEEP_TRACK]: new Queue(QUEUE_NAMES.SWEEP_TRACK, {
        connection,
        ...defaultQueueOptions,
      }),
      [QUEUE_NAMES.BRIDGE_EXECUTE]: new Queue(QUEUE_NAMES.BRIDGE_EXECUTE, {
        connection,
        ...defaultQueueOptions,
        defaultJobOptions: {
          ...defaultQueueOptions.defaultJobOptions,
          attempts: 3,
          backoff: {
            type: "exponential" as const,
            delay: 5000, // 5 second initial delay for bridges
          },
        },
      }),
      [QUEUE_NAMES.BRIDGE_TRACK]: new Queue(QUEUE_NAMES.BRIDGE_TRACK, {
        connection,
        ...defaultQueueOptions,
        defaultJobOptions: {
          ...defaultQueueOptions.defaultJobOptions,
          attempts: 1, // Single attempt, will requeue manually
        },
      }),
    };
  }

  return queues;
}

/**
 * Get queue events for waiting on job completion
 */
export function getQueueEvents(): Record<QueueName, QueueEvents> {
  if (!queueEvents) {
    const connection = { url: getRedisUrl() };

    queueEvents = {
      [QUEUE_NAMES.WALLET_SCAN]: new QueueEvents(QUEUE_NAMES.WALLET_SCAN, { connection }),
      [QUEUE_NAMES.PRICE_UPDATE]: new QueueEvents(QUEUE_NAMES.PRICE_UPDATE, { connection }),
      [QUEUE_NAMES.SWEEP_EXECUTE]: new QueueEvents(QUEUE_NAMES.SWEEP_EXECUTE, { connection }),
      [QUEUE_NAMES.SWEEP_TRACK]: new QueueEvents(QUEUE_NAMES.SWEEP_TRACK, { connection }),
      [QUEUE_NAMES.BRIDGE_EXECUTE]: new QueueEvents(QUEUE_NAMES.BRIDGE_EXECUTE, { connection }),
      [QUEUE_NAMES.BRIDGE_TRACK]: new QueueEvents(QUEUE_NAMES.BRIDGE_TRACK, { connection }),
    };
  }

  return queueEvents;
}

/**
 * Add a job to scan a wallet for dust tokens
 */
export async function addWalletScanJob(
  data: WalletScanJobData,
  options?: { priority?: number; delay?: number }
): Promise<Job<WalletScanJobData>> {
  const queues = getQueues();
  return queues[QUEUE_NAMES.WALLET_SCAN].add("scan", data, {
    priority: options?.priority ?? 0,
    delay: options?.delay,
    jobId: `scan-${data.walletAddress}-${Date.now()}`,
  });
}

/**
 * Add a job to update token prices
 */
export async function addPriceUpdateJob(
  data: PriceUpdateJobData,
  options?: { priority?: number; delay?: number }
): Promise<Job<PriceUpdateJobData>> {
  const queues = getQueues();
  return queues[QUEUE_NAMES.PRICE_UPDATE].add("update", data, {
    priority: options?.priority ?? 0,
    delay: options?.delay,
    jobId: `price-${data.chain}-${data.tokenAddress.toLowerCase()}`,
  });
}

/**
 * Add a job to execute a sweep
 */
export async function addSweepExecuteJob(
  data: SweepExecuteJobData,
  options?: { priority?: number }
): Promise<Job<SweepExecuteJobData>> {
  const queues = getQueues();
  return queues[QUEUE_NAMES.SWEEP_EXECUTE].add("execute", data, {
    priority: options?.priority ?? 0,
    jobId: `sweep-${data.sweepId}`,
  });
}

/**
 * Add a job to track a sweep transaction
 */
export async function addSweepTrackJob(
  data: SweepTrackJobData,
  options?: { delay?: number }
): Promise<Job<SweepTrackJobData>> {
  const queues = getQueues();
  return queues[QUEUE_NAMES.SWEEP_TRACK].add("track", data, {
    delay: options?.delay ?? 5000, // Start checking after 5 seconds
    jobId: `track-${data.sweepId}-${data.txHash}`,
  });
}

/**
 * Add a job to execute bridges for a multi-chain sweep
 */
export async function addBridgeExecuteJob(
  data: BridgeExecuteJobData,
  options?: { priority?: number }
): Promise<Job<BridgeExecuteJobData>> {
  const queues = getQueues();
  return queues[QUEUE_NAMES.BRIDGE_EXECUTE].add("execute", data, {
    priority: options?.priority ?? 0,
    jobId: `bridge-${data.planId}`,
  });
}

/**
 * Add a job to track a bridge transaction
 */
export async function addBridgeTrackJob(
  data: BridgeTrackJobData,
  options?: { delay?: number }
): Promise<Job<BridgeTrackJobData>> {
  const queues = getQueues();
  return queues[QUEUE_NAMES.BRIDGE_TRACK].add("track", data, {
    delay: options?.delay ?? 10000, // Start checking after 10 seconds (bridges take longer)
    jobId: `bridge-track-${data.bridgeId}-${data.sourceTxHash}`,
  });
}

/**
 * Add bulk bridge tracking jobs
 */
export async function addBulkBridgeTrackJobs(
  bridges: BridgeTrackJobData[]
): Promise<void> {
  const queues = getQueues();
  const jobs = bridges.map((bridge) => ({
    name: "track",
    data: bridge,
    opts: {
      delay: 10000,
      jobId: `bridge-track-${bridge.bridgeId}-${bridge.sourceTxHash}`,
    },
  }));

  await queues[QUEUE_NAMES.BRIDGE_TRACK].addBulk(jobs);
}

/**
 * Add bulk price update jobs
 */
export async function addBulkPriceUpdateJobs(
  tokens: { address: string; chain: string }[]
): Promise<void> {
  const queues = getQueues();
  const jobs = tokens.map((token) => ({
    name: "update",
    data: { tokenAddress: token.address, chain: token.chain },
    opts: {
      jobId: `price-${token.chain}-${token.address.toLowerCase()}`,
    },
  }));

  await queues[QUEUE_NAMES.PRICE_UPDATE].addBulk(jobs);
}

/**
 * Wait for a job to complete with timeout
 */
export async function waitForJob<T>(
  queueName: QueueName,
  jobId: string,
  timeoutMs: number = 30000
): Promise<T> {
  const events = getQueueEvents();
  const queueEvent = events[queueName];

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Job ${jobId} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    queueEvent.on("completed", ({ jobId: completedJobId, returnvalue }) => {
      if (completedJobId === jobId) {
        clearTimeout(timeout);
        resolve(returnvalue as T);
      }
    });

    queueEvent.on("failed", ({ jobId: failedJobId, failedReason }) => {
      if (failedJobId === jobId) {
        clearTimeout(timeout);
        reject(new Error(failedReason));
      }
    });
  });
}

/**
 * Clean up all queues (for graceful shutdown)
 */
export async function closeQueues(): Promise<void> {
  if (queues) {
    await Promise.all(Object.values(queues).map((q) => q.close()));
    queues = null;
  }

  if (queueEvents) {
    await Promise.all(Object.values(queueEvents).map((e) => e.close()));
    queueEvents = null;
  }
}

// Export types for workers
export type { Job };
