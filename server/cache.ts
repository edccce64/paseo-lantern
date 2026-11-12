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
