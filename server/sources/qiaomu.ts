import type { FeedItem, FeedState } from "../../shared/feed";
import { readCache, writeCache } from "../cache";
import { rateLimitMessage } from "../errors";
import { getJson } from "./http";

const TTL_MS = 10 * 60 * 1000;
const SOURCES_TTL_MS = 6 * 60 * 60 * 1000;

type QiaomuEntry = {
  id: string;
  sourceId?: string;
  title?: string;
  titleZh?: string | null;
  link?: string;
  author?: string | null;
  published?: string;
  publishedTs?: number;
  summary?: string | null;
  summaryZh?: string | null;
};

type QiaomuEntriesResponse = { entries?: QiaomuEntry[] };

type QiaomuSourcesResponse = { sources?: Array<{ id: string; name?: string }> };

export type SourceResult = {
  items: FeedItem[];
  fetchedAt: number;
  state: FeedState;
};

export async function sourceNames(): Promise<Map<string, string>> {
  const cached = await readCache<Array<{ id: string; name: string }>>("qiaomu-sources");
  const fresh = cached !== null && Date.now() - cached.fetchedAt < SOURCES_TTL_MS;
  if (cached && fresh) {
    return new Map(cached.data.map((entry) => [entry.id, entry.name]));
  }
  try {
    const response = await getJson<QiaomuSourcesResponse>(
      "https://rss.qiaomu.ai/api/sources",
      cached?.etag ?? null,
    );
    if (response.kind === "ok") {
      const list = (response.data.sources ?? [])
        .filter((entry) => typeof entry.id === "string")
        .map((entry) => ({ id: entry.id, name: entry.name ?? entry.id }));
      await writeCache("qiaomu-sources", {
        data: list,
        etag: response.etag,
        fetchedAt: Date.now(),
      });
      return new Map(list.map((entry) => [entry.id, entry.name]));
    }
  } catch (error) {
    console.warn("[lantern] qiaomu sources failed", error);
  }
  return new Map((cached?.data ?? []).map((entry) => [entry.id, entry.name]));
}

function toItem(entry: QiaomuEntry, names: Map<string, string>): FeedItem {
  const publishedAt =
    entry.published ??
    (entry.publishedTs ? new Date(entry.publishedTs).toISOString() : new Date().toISOString());
  return {
    id: entry.id,
    source: "qiaomu",
    title: entry.titleZh?.trim() || entry.title?.trim() || "(无标题)",
    origin: names.get(entry.sourceId ?? "") ?? entry.sourceId ?? "乔木精选",
    summary: entry.summaryZh?.trim() || entry.summary?.trim() || null,
    url: entry.link ?? "https://rss.qiaomu.ai",
    siteUrl: null,
    publishedAt,
    badge: null,
  };
}

export async function fetchQiaomu(limit: number, force: boolean): Promise<SourceResult> {
  const channel = "qiaomu";
  const cached = await readCache<FeedItem[]>(channel);
  const fresh = cached !== null && Date.now() - cached.fetchedAt < TTL_MS;
  if (fresh && !force) {
    return { items: cached.data, fetchedAt: cached.fetchedAt, state: "cached" };
  }

  try {
    const response = await getJson<QiaomuEntriesResponse>(
      `https://rss.qiaomu.ai/api/entries?limit=${limit}`,
      cached?.etag ?? null,
    );
    if (response.kind === "not-modified" && cached) {
      const fetchedAt = Date.now();
      await writeCache(channel, { data: cached.data, etag: cached.etag, fetchedAt });
      return { items: cached.data, fetchedAt, state: "revalidated" };
    }
    if (response.kind === "rate-limited") {
      throw new Error(rateLimitMessage(response.retryAfterMs));
    }
    if (response.kind !== "ok") throw new Error("乔木服务返回了未知响应");
    const names = await sourceNames();
    const items = (response.data.entries ?? []).map((entry) => toItem(entry, names));
    const fetchedAt = Date.now();
    await writeCache(channel, { data: items, etag: response.etag, fetchedAt });
    return { items, fetchedAt, state: "live" };
  } catch (error) {
    if (cached) {
      console.warn("[lantern] qiaomu fetch failed, serving cache", error);
      return { items: cached.data, fetchedAt: cached.fetchedAt, state: "stale" };
    }
    throw error;
  }
}
