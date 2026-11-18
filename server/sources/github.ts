import type { FeedItem, FeedState } from "../../shared/feed";
import { readFeedCache, writeCache } from "../cache";
import { rateLimitMessage } from "../errors";
import { getJson } from "./http";

const TTL_MS = 30 * 60 * 1000;
const PER_PAGE = 100;
const MAX_PAGES = 3;
const CACHE_KEY = "github-stars";

/** 收藏的账号。公开收藏可以匿名读，不需要 token。 */
const LOGIN = process.env.LANTERN_GITHUB_LOGIN?.trim() || "edccce64";

type GithubRepo = {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string | null;
  archived: boolean;
  fork: boolean;
};

export type SourceResult = {
  items: FeedItem[];
  fetchedAt: number;
  state: FeedState;
};

/** 11.2k / 940 */
function formatCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

function toItem(repo: GithubRepo): FeedItem {
  const pushedAt = repo.pushed_at ?? new Date().toISOString();
  const ageDays = (Date.now() - new Date(pushedAt).getTime()) / 86400000;
  const language = repo.language ?? "仓库";
  return {
    id: `github:${repo.full_name}`,
    source: "github",
    title: repo.full_name,
    origin: `${language} · ★${formatCount(repo.stargazers_count)}`,
    site: repo.full_name.split("/")[0] ?? null,
    summary: repo.description,
    url: repo.html_url,
    siteUrl: repo.html_url,
    publishedAt: pushedAt,
    badge: repo.archived ? "已归档" : ageDays <= 7 ? "本周更新" : null,
  };
}

/** 收藏的项目，按最近提交排序。 */
export async function fetchGithubStars(limit: number, force: boolean): Promise<SourceResult> {
  const cached = await readFeedCache(CACHE_KEY);
  const fresh = cached !== null && Date.now() - cached.fetchedAt < TTL_MS;
  if (fresh && !force) {
    return { items: cached.data.slice(0, limit), fetchedAt: cached.fetchedAt, state: "cached" };
  }

  try {
    const items: FeedItem[] = [];
    let etag: string | null = cached?.etag ?? null;
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const url = `https://api.github.com/users/${encodeURIComponent(LOGIN)}/starred?per_page=${PER_PAGE}&page=${page}`;
      // 只有第一页带 ETag，后面翻页直接拿
      const response = await getJson<GithubRepo[]>(url, page === 1 ? etag : null);
      if (response.kind === "not-modified" && cached) {
        const fetchedAt = Date.now();
        await writeCache(CACHE_KEY, { data: cached.data, etag: cached.etag, fetchedAt });
        return { items: cached.data.slice(0, limit), fetchedAt, state: "revalidated" };
      }
      if (response.kind === "rate-limited") {
        throw new Error(rateLimitMessage(response.retryAfterMs));
      }
      if (response.kind !== "ok") throw new Error("GitHub 返回了未知响应");
      const repos = Array.isArray(response.data) ? response.data : [];
      for (const repo of repos) items.push(toItem(repo));
      if (page === 1) etag = response.etag;
      if (repos.length < PER_PAGE) break;
    }

    items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const fetchedAt = Date.now();
    await writeCache(CACHE_KEY, { data: items, etag, fetchedAt });
    return { items: items.slice(0, limit), fetchedAt, state: "live" };
  } catch (error) {
    if (cached) {
      console.warn("[lantern] github stars fetch failed, serving cache", error);
      return { items: cached.data.slice(0, limit), fetchedAt: cached.fetchedAt, state: "stale" };
    }
    throw error;
  }
}
