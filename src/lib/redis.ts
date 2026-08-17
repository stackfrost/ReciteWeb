import { Redis } from '@upstash/redis';

// Initializes the Redis client automatically using the environment variables:
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// If these are missing (e.g., local dev without Redis), we catch and mock it to prevent crashes.
export const redis = process.env.UPSTASH_REDIS_REST_URL 
  ? Redis.fromEnv() 
  : null;

/**
 * A highly reusable wrapper to cache expensive LLM or API calls.
 * 
 * @param key - The unique cache key (e.g., `search:quantum_spin_liquids`)
 * @param fetcher - The async function to run if there is a cache miss
 * @param ttlSeconds - Time-To-Live in seconds (default: 24 hours = 86400s)
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 86400
): Promise<T> {
  // If Redis isn't configured, bypass cache and just run the fetcher
  if (!redis) {
    return fetcher();
  }

  try {
    // 1. Check for cached data
    const cachedData = await redis.get<T>(key);
    if (cachedData) {
      return cachedData;
    }
  } catch (error) {
    console.warn(`[Redis GET Error] Failed to fetch key: ${key}. Proceeding without cache.`, error);
  }

  // 2. Cache miss: Execute the heavy function
  const freshData = await fetcher();

  try {
    // 3. Store the fresh data for next time
    // Only cache if data actually exists (don't cache empty arrays for searches)
    if (freshData && (!Array.isArray(freshData) || freshData.length > 0)) {
      await redis.setex(key, ttlSeconds, freshData);
    }
  } catch (error) {
    console.warn(`[Redis SET Error] Failed to save key: ${key}.`, error);
  }

  return freshData;
}