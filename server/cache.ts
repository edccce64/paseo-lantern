import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const CACHE_DIR = path.join(os.homedir(), ".paseo", "data", "paseo-lantern");

export type CacheEntry<T> = {
  data: T;
  etag: string | null;
  fetchedAt: number;
};

const memory = new Map<string, CacheEntry<unknown>>();

function fileFor(key: string): string {
  return path.join(CACHE_DIR, `${key.replace(/[^a-z0-9-]/gi, "_")}.json`);
}

export function peekMemory<T>(key: string): CacheEntry<T> | null {
  return (memory.get(key) as CacheEntry<T> | undefined) ?? null;
}

export async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  const inMemory = peekMemory<T>(key);
  if (inMemory) return inMemory;
  try {
    const raw = await fs.readFile(fileFor(key), "utf8");
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (typeof parsed?.fetchedAt !== "number") return null;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, entry: CacheEntry<T>): Promise<void> {
  memory.set(key, entry);
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(fileFor(key), JSON.stringify(entry), "utf8");
  } catch (error) {
    console.warn(`[lantern] cache write failed for ${key}`, error);
  }
}

/** 订阅正文缓存：只留最近 100 篇，超过 30 天的删掉 */
const PAGE_PREFIX = "page-";
export const MAX_PAGE_FILES = 100;
export const MAX_PAGE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

let lastPrune = 0;

/**
 * 清理订阅正文缓存。只动 `page-*.json`，不碰列表缓存、译文、订阅文件。
 * 一小时最多扫一次，force 可强制。
 */
export async function prunePageCache(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;

  try {
    const names = (await fs.readdir(CACHE_DIR)).filter(
      (name) => name.startsWith(PAGE_PREFIX) && name.endsWith(".json"),
    );
    if (names.length <= MAX_PAGE_FILES) {
      // 数量没超，只按时间删
      const stale: string[] = [];
      for (const name of names) {
        const stat = await fs.stat(path.join(CACHE_DIR, name)).catch(() => null);
        if (stat && now - stat.mtimeMs > MAX_PAGE_AGE_MS) stale.push(name);
      }
      for (const name of stale) {
        const key = name.slice(0, -".json".length);
        memory.delete(key);
        await fs.rm(path.join(CACHE_DIR, name), { force: true });
      }
      if (stale.length > 0) console.warn(`[lantern] pruned ${stale.length} stale page caches`);
      return;
    }

    const entries: Array<{ name: string; mtimeMs: number }> = [];
    for (const name of names) {
      const stat = await fs.stat(path.join(CACHE_DIR, name)).catch(() => null);
      if (stat) entries.push({ name, mtimeMs: stat.mtimeMs });
    }
    entries.sort((a, b) => b.mtimeMs - a.mtimeMs);

    const doomed = entries.filter(
      (entry, index) => index >= MAX_PAGE_FILES || now - entry.mtimeMs > MAX_PAGE_AGE_MS,
    );
    for (const entry of doomed) {
      const key = entry.name.slice(0, -".json".length);
      memory.delete(key);
      await fs.rm(path.join(CACHE_DIR, entry.name), { force: true });
    }
    if (doomed.length > 0) console.warn(`[lantern] pruned ${doomed.length} page caches`);
  } catch (error) {
    console.warn("[lantern] prune failed", error);
  }
}
