import type { FeedItem, FeedState } from "../../shared/feed";
import { readCache, writeCache } from "../cache";
import { getJson } from "./http";

const TTL_MS = 10 * 60 * 1000;

type AihotItem = {
  id: string;
  title: string;
  summary?: string | null;
  source?: { name?: string };
  links?: { aihot?: string; original?: string };
  publishedAt?: string;
  discoveredAt?: string;
};

type AihotItemsResponse = { items?: AihotItem[] };

type AihotHotItem = {
  rank: number;
  id: string;
  title: string;
  source?: { name?: string };
  links?: { aihot?: string; original?: string; story?: string };
  sourceCount?: number;
  latestAt?: string;
};

type AihotHotResponse = { items?: AihotHotItem[] };

export type SourceResult = {
  items: FeedItem[];
  fetchedAt: number;
  state: FeedState;
};

function toSelectedItem(item: AihotItem): FeedItem {
  return {
    id: item.id,
    source: "aihot",
    title: item.title,
    origin: item.source?.name ?? "AIHOT",
    summary: item.summary ?? null,
    url: item.links?.original ?? item.links?.aihot ?? "https://aihot.news",
    siteUrl: item.links?.aihot ?? null,
    publishedAt: item.publishedAt ?? item.discoveredAt ?? new Date().toISOString(),
    badge: "精选",
  };
}

function toHotItem(item: AihotHotItem): FeedItem {
  return {
    id: item.id,
    source: "aihot",
    title: item.title,
    origin: item.source?.name ?? "AIHOT",
    summary: null,
    url: item.links?.original ?? item.links?.aihot ?? "https://aihot.news",
    siteUrl: item.links?.story ?? item.links?.aihot ?? null,
    publishedAt: item.latestAt ?? new Date().toISOString(),
    badge: item.sourceCount ? `${item.sourceCount} 家信源` : null,
  };
}

export async function fetchAihot(
  channel: "aihot-selected" | "aihot-hot",
  limit: number,
  force: boolean,
): Promise<SourceResult> {
  const isSelected = channel === "aihot-selected";
  const url = isSelected
    ? `https://aihot.news/api/v1/items?mode=selected&window=24h&limit=${limit}`
    : "https://aihot.news/api/v1/hot-topics";

  const cached = await readCache<FeedItem[]>(channel);
  const fresh = cached !== null && Date.now() - cached.fetchedAt < TTL_MS;
  if (fresh && !force) {
    return { items: cached.data, fetchedAt: cached.fetchedAt, state: "cached" };
  }

  try {
    if (isSelected) {
      const response = await getJson<AihotItemsResponse>(url, cached?.etag ?? null);
      if (response.kind === "not-modified" && cached) {
        const fetchedAt = Date.now();
        await writeCache(channel, { data: cached.data, etag: cached.etag, fetchedAt });
        return { items: cached.data, fetchedAt, state: "revalidated" };
      }
      if (response.kind === "rate-limited") {
        throw new Error(`AIHOT 限流，约 ${Math.round(response.retryAfterMs / 1000)} 秒后再试`);
      }
      if (response.kind !== "ok") throw new Error("AIHOT 返回了未知响应");
      const items = (response.data.items ?? []).map(toSelectedItem);
      const fetchedAt = Date.now();
      await writeCache(channel, { data: items, etag: response.etag, fetchedAt });
      return { items, fetchedAt, state: "live" };
    }

    const response = await getJson<AihotHotResponse>(url, cached?.etag ?? null);
    if (response.kind === "not-modified" && cached) {
      const fetchedAt = Date.now();
      await writeCache(channel, { data: cached.data, etag: cached.etag, fetchedAt });
      return { items: cached.data, fetchedAt, state: "revalidated" };
    }
    if (response.kind === "rate-limited") {
      throw new Error(`AIHOT 限流，约 ${Math.round(response.retryAfterMs / 1000)} 秒后再试`);
    }
    if (response.kind !== "ok") throw new Error("AIHOT 返回了未知响应");
    const items = (response.data.items ?? []).map(toHotItem);
    const fetchedAt = Date.now();
    await writeCache(channel, { data: items, etag: response.etag, fetchedAt });
    return { items, fetchedAt, state: "live" };
  } catch (error) {
    if (cached) {
      console.warn("[lantern] aihot fetch failed, serving cache", error);
      return { items: cached.data, fetchedAt: cached.fetchedAt, state: "stale" };
    }
    throw error;
  }
}
