import crypto from "node:crypto";
import type { ArticleResult, ArticleVersion } from "../shared/article";
import { readCache, writeCache } from "./cache";
import { readLocalRewrite } from "./rewrite-files";
import { isMostlyEnglish } from "./text/lang";
import { extractFromPage } from "./text/markdown";

const BODY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_TIMEOUT_MS = 20_000;

type TextCache = { markdown: string };

function keyFor(url: string): string {
  // 不能截断 base64：新闻站的 URL 前 30 字节几乎相同（/2026/11/12/…），
  // 截成 40 字符后同一天的文章会撞到同一个缓存键，读到别篇的正文。
  return `page-${crypto.createHash("sha1").update(url).digest("hex").slice(0, 20)}`;
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
  version?: ArticleVersion;
}): Promise<ArticleResult> {
  const key = keyFor(input.url);
  const cached = await readCache<TextCache>(key);

  let body: string | null = null;
  if (cached && Date.now() - cached.fetchedAt < BODY_TTL_MS && cached.data.markdown) {
    body = cached.data.markdown;
  } else {
    body = await loadPage(input.url);
    if (body) {
      await writeCache(key, { data: { markdown: body }, etag: null, fetchedAt: Date.now() });
    }
  }

  const localRewrite = await readLocalRewrite(input.id);
  const base = {
    title: input.title,
    origin: input.origin,
    publishedAt: input.publishedAt,
    url: input.url,
    summary: input.summary,
    versions: { original: true, translation: false, rewrite: false, local: localRewrite !== null },
    looksEnglish: body ? isMostlyEnglish(body) : false,
  };

  if (input.version === "local") {
    if (localRewrite) {
      return { ...base, markdown: localRewrite, bodyState: "full", note: null };
    }
    return {
      ...base,
      markdown: body ?? input.summary,
      bodyState: body ? "full" : input.summary ? "summary" : "unavailable",
      note: "本地中文稿不在了，可以再生成一次。",
    };
  }

  if (body) {
    return { ...base, markdown: body, bodyState: "full", note: null };
  }

  return {
    ...base,
    markdown: input.summary,
    bodyState: input.summary ? "summary" : "unavailable",
    note: "抓不到正文，点下面的按钮去原文读。",
  };
}
