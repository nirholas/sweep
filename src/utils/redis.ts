import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    redis = new Redis(url, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });
  }
  return redis;
}

// Cache helper with TTL
export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await getRedis().get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheGetOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}
