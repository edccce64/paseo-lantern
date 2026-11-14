import type { FeedItem, FeedState } from "../shared/feed";
import type { Subscription } from "../shared/subs";
import { readFeedCache, writeCache } from "./cache";
import { parseFeed } from "./feeds/parse";
import { describeFetchError, rateLimitMessage } from "./errors";
import { getText } from "./sources/http";
import { readSubs } from "./subs";
import { cleanSourceName } from "./text/source-name";

const REFRESH_MS = 15 * 60 * 1000;
const MAX_ITEMS = 200;
const CONCURRENCY = 5;

export type MineResult = {
  items: FeedItem[];
  fetchedAt: number;
  state: FeedState;
};

type SourceState = {
  items: FeedItem[];
  fetchedAt: number;
  state: FeedState;
};

async function refreshOne(sub: Subscription, force: boolean): Promise<SourceState> {
  const key = `mine-${sub.id}`;
  const cached = await readFeedCache(key);
  const fresh = cached !== null && Date.now() - cached.fetchedAt < REFRESH_MS;
  if (fresh && !force) {
    return { items: cached.data, fetchedAt: cached.fetchedAt, state: "cached" };
  }

  try {
    const response = await getText(sub.url, cached?.etag ?? null);
    if (response.kind === "not-modified" && cached) {
      const fetchedAt = Date.now();
      await writeCache(key, { data: cached.data, etag: cached.etag, fetchedAt });
      return { items: cached.data, fetchedAt, state: "revalidated" };
    }
    if (response.kind === "rate-limited") {
      throw new Error(rateLimitMessage(response.retryAfterMs));
    }
    if (response.kind !== "ok") throw new Error("源返回异常");

    const parsed = parseFeed(response.text);
    const { site, label } = cleanSourceName(sub.title);
    const items: FeedItem[] = parsed.items.slice(0, MAX_ITEMS).map((entry) => ({
      id: entry.id || entry.url,
      source: "rss",
      title: entry.title,
      origin: site ?? label,
      site,
      summary: entry.summary,
      url: entry.url || sub.url,
      siteUrl: null,
      publishedAt: entry.publishedAt,
      badge: null,
    }));
    const fetchedAt = Date.now();
    await writeCache(key, { data: items, etag: response.etag, fetchedAt });
    return { items, fetchedAt, state: items.length > 0 ? "live" : "revalidated" };
  } catch (error) {
    console.warn(`[lantern] feed failed: ${sub.title}`, describeFetchError(error, sub.title));
    if (cached) return { items: cached.data, fetchedAt: cached.fetchedAt, state: "stale" };
    return { items: [], fetchedAt: Date.now(), state: "stale" };
  }
}

async function pool<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await run(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
}

export async function listMine(limit: number, force: boolean): Promise<MineResult> {
  const subs = await readSubs();
  if (subs.length === 0) {
    return { items: [], fetchedAt: Date.now(), state: "live" };
  }

  const states = await pool(subs, CONCURRENCY, (sub) => refreshOne(sub, force));
  const items = states
    .flatMap((state) => state.items)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);

  const fetchedAt = states.reduce((latest, state) => Math.max(latest, state.fetchedAt), 0);
  const anyStale = states.some((state) => state.state === "stale");
  const anyLive = states.some((state) => state.state === "live" || state.state === "revalidated");
  const state: FeedState = anyStale ? "stale" : anyLive ? "live" : "cached";

  return { items, fetchedAt: fetchedAt || Date.now(), state };
}

export const MINE_SOURCE = "mine";
