import type { FeedItem } from "../../shared/feed";
import { readFeedCache, writeCache } from "../cache";
import { getJson } from "./http";
import type { SourceResult } from "./aihot";

/**
 * XFeed（xfeed.ai）：追踪 X 上 AI 创作者的动态。
 *
 * 站点没有公开 API，前端读的是公开的静态 JSON：
 * https://xfeed.ai/data.json
 * 里面每条都有 XFeed 写的中文标题与中文摘要，原帖链接指向 x.com，
 * 正文由 FxTwitter 匿名 API 抓（见 sources/fxtwitter.ts）。
 */

const TTL_MS = 30 * 60 * 1000;
const URL = "https://xfeed.ai/data.json";

type XfeedItem = {
  id?: string;
  title?: string;
  displayTitle?: string;
  displaySummary?: string;
  excerptZh?: string;
  author?: string;
  handle?: string;
  url?: string;
  category?: string;
  type?: string;
  tools?: string[];
  lang?: string;
  likes?: number;
  createdAt?: string;
};

type XfeedResponse = { updatedAt?: string; items?: XfeedItem[] };

function toItem(item: XfeedItem): FeedItem | null {
  const url = item.url ?? "";
  const id = item.id ?? "";
  if (!url || !id) return null;

  const author = item.author?.trim() || item.handle?.trim() || "XFeed";
  const title = item.displayTitle?.trim() || item.title?.trim() || "";
  if (!title) return null;

  return {
    id,
    source: "xfeed",
    title,
    origin: author,
    site: author,
    summary: item.displaySummary?.trim() || item.excerptZh?.trim() || null,
    url,
    siteUrl: url,
    publishedAt: item.createdAt ?? new Date().toISOString(),
    badge: item.type ?? null,
  };
}

export async function fetchXfeed(limit: number, force: boolean): Promise<SourceResult> {
  const cached = await readFeedCache("xfeed");
  const fresh = cached !== null && Date.now() - cached.fetchedAt < TTL_MS;
  if (fresh && !force) {
    return {
      items: cached.data.slice(0, limit),
      fetchedAt: cached.fetchedAt,
      state: "cached",
    };
  }

  try {
    const response = await getJson<XfeedResponse>(URL, null);
    if (response.kind === "rate-limited") {
      throw new Error("对方限流了，过一会儿再试");
    }
    if (response.kind !== "ok") throw new Error("XFeed 返回了未知响应");

    const items = (response.data.items ?? [])
      .map(toItem)
      .filter((item): item is FeedItem => item !== null)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const fetchedAt = Date.now();
    await writeCache("xfeed", { data: items, etag: null, fetchedAt });
    return { items: items.slice(0, limit), fetchedAt, state: "live" };
  } catch (error) {
    if (cached) {
      console.warn("[lantern] xfeed fetch failed, serving cache", error);
      return {
        items: cached.data.slice(0, limit),
        fetchedAt: cached.fetchedAt,
        state: "stale",
      };
    }
    throw error;
  }
}
