import Redis from "ioredis";
import { env } from "./config.js";

let redis;

export function getRedis() {
  if (!redis) redis = new Redis(env("REDIS_URL", "redis://localhost:6379"));
  return redis;
}

export async function withRedisLock(key, ttlMs, handler) {
  const client = getRedis();
  const token = `${Date.now()}:${Math.random()}`;
  const acquired = await client.set(key, token, "PX", ttlMs, "NX");
  if (!acquired) return { locked: false };

  try {
    return { locked: true, value: await handler() };
  } finally {
    const current = await client.get(key);
    if (current === token) await client.del(key);
  }
}
