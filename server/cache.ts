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
/** 整个缓存目录的总量上限，超出按最旧淘汰 */
export const MAX_CACHE_BYTES = 100 * 1024 * 1024;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
/** 订阅列表是用户数据，淘汰时永远不删 */
const PROTECTED_FILES = new Set(["subscriptions.json", "subscriptions.json.tmp"]);

let lastPrune = 0;

/**
 * 清理缓存：正文按篇数与天数淘汰，整个目录按 100 MB 淘汰。
 * 一小时最多扫一次，force 可强制。
 */
export async function prunePageCache(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;

  await prunePages(now);
  await pruneSize();
}

async function prunePages(now: number): Promise<void> {
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
    console.warn("[lantern] prune pages failed", error);
  }
}

type CacheFile = { path: string; size: number; mtimeMs: number };

async function collectFiles(dir: string, out: CacheFile[]): Promise<void> {
  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(full, out);
      continue;
    }
    if (!entry.name.endsWith(".json") || PROTECTED_FILES.has(entry.name)) continue;
    const stat = await fs.stat(full).catch(() => null);
    if (stat) out.push({ path: full, size: stat.size, mtimeMs: stat.mtimeMs });
  }
}

/** 目录总量超 100 MB 时，从最旧的开始删到上限以内 */
async function pruneSize(): Promise<void> {
  try {
    const files: CacheFile[] = [];
    await collectFiles(CACHE_DIR, files);
    let total = files.reduce((sum, file) => sum + file.size, 0);
    if (total <= MAX_CACHE_BYTES) return;

    files.sort((a, b) => a.mtimeMs - b.mtimeMs);
    let removed = 0;
    for (const file of files) {
      if (total <= MAX_CACHE_BYTES) break;
      await fs.rm(file.path, { force: true });
      total -= file.size;
      removed += 1;
      const key = path.relative(CACHE_DIR, file.path).slice(0, -".json".length);
      memory.delete(key);
    }
    if (removed > 0) {
      console.warn(`[lantern] pruned ${removed} files to stay under ${MAX_CACHE_BYTES} bytes`);
    }
  } catch (error) {
    console.warn("[lantern] prune size failed", error);
  }
}
