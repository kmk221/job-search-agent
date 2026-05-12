// Vercel KV with in-memory fallback for local dev.
// Production: KV_REST_API_URL + KV_REST_API_TOKEN are injected by Vercel.
// Local dev: if those env vars are absent, all operations hit a module-level Map.
// Note: @vercel/kv is deprecated but existing KV stores migrated to Upstash Redis
// and continue to work with the same env vars through this package.

import { kv } from '@vercel/kv';

const memCache = new Map();

const kvAvailable = () =>
  Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export async function kvGet(key) {
  if (!kvAvailable()) return memCache.get(key) ?? null;
  try {
    return await kv.get(key);
  } catch {
    return memCache.get(key) ?? null;
  }
}

export async function kvMget(keys) {
  if (keys.length === 0) return [];
  if (!kvAvailable()) return keys.map((k) => memCache.get(k) ?? null);
  try {
    return await kv.mget(...keys);
  } catch {
    return keys.map((k) => memCache.get(k) ?? null);
  }
}

export async function kvSet(key, value, exSeconds) {
  if (!kvAvailable()) {
    memCache.set(key, value);
    return;
  }
  try {
    await kv.set(key, value, { ex: exSeconds });
  } catch {
    memCache.set(key, value);
  }
}
