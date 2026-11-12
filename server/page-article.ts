import type { ArticleResult } from "../shared/article";
import { readCache, writeCache } from "./cache";
import { extractFromPage } from "./text/markdown";

const BODY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_TIMEOUT_MS = 20_000;

type TextCache = { markdown: string };

function keyFor(url: string): string {
  return `page-${Buffer.from(url).toString("base64url").slice(0, 40)}`;
}

async function loadPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "paseo-lantern/0.1 (+https://paseo.sh)",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return extractFromPage(await response.text());
  } catch (error) {
    console.warn("[lantern] page fetch failed", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 个人订阅条目：只有链接，正文要现抓。 */
export async function fetchPageArticle(input: {
  id: string;
  url: string;
  title: string;
  origin: string;
  publishedAt: string;
  summary: string | null;
}): Promise<ArticleResult> {
  const key = keyFor(input.url);
  const cached = await readCache<TextCache>(key);
  const base = {
    title: input.title,
    origin: input.origin,
    publishedAt: input.publishedAt,
    url: input.url,
    summary: input.summary,
    versions: { original: true, translation: false, rewrite: false },
  };

  if (cached && Date.now() - cached.fetchedAt < BODY_TTL_MS && cached.data.markdown) {
    return { ...base, markdown: cached.data.markdown, bodyState: "full", note: null };
  }

  const markdown = await loadPage(input.url);
  if (markdown) {
    await writeCache(key, { data: { markdown }, etag: null, fetchedAt: Date.now() });
    return { ...base, markdown, bodyState: "full", note: null };
  }

  return {
    ...base,
    markdown: input.summary,
    bodyState: input.summary ? "summary" : "unavailable",
    note: "抓不到正文，点下面的按钮去原文读。",
  };
}
