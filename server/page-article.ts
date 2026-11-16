import crypto from "node:crypto";
import type { ArticleResult, ArticleVersion } from "../shared/article";
import { prunePageCache, readCache, writeCache } from "./cache";
import { isMostlyEnglish } from "./text/lang";
import { cleanBoilerplate, extractFromPage } from "./text/markdown";
import { fetchXPost, isXStatusUrl } from "./sources/fxtwitter";
import { readTranslation } from "./translate-store";

const BODY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_TIMEOUT_MS = 20_000;

type TextCache = { markdown: string };

function keyFor(url: string): string {
  // 不能截断 base64：新闻站的 URL 前 30 字节几乎相同（/2026/11/12/…），
  // 截成 40 字符后同一天的文章会撞到同一个缓存键，读到别篇的正文。
  return `page-${crypto.createHash("sha1").update(url).digest("hex").slice(0, 20)}`;
}

async function loadPage(url: string): Promise<string | null> {
  // x.com 的页面要登录，直接抓只会拿到登录墙。走 FxTwitter 匿名 API，
  // 能拿到长推文全文与 X Article 的完整正文。
  if (isXStatusUrl(url)) {
    const post = await fetchXPost(url);
    return post?.markdown ?? null;
  }

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
    body = cleanBoilerplate(cached.data.markdown, input.origin);
  } else {
    body = await loadPage(input.url);
    if (body) {
      body = cleanBoilerplate(body, input.origin);
      await writeCache(key, { data: { markdown: body }, etag: null, fetchedAt: Date.now() });
      // 写之后顺手清一次（内部限流，一小时最多一次）
      void prunePageCache();
    }
  }

  const translation = await readTranslation(input.id);
  const base = {
    title: input.title,
    origin: input.origin,
    publishedAt: input.publishedAt,
    url: input.url,
    summary: input.summary,
    versions: {
      original: true,
      translation: translation !== null,
      rewrite: false,
    },
    looksEnglish: body ? isMostlyEnglish(body) : false,
  };

  if (input.version === "translation") {
    if (translation) {
      return { ...base, markdown: translation.markdown, bodyState: "full", note: null };
    }
    return {
      ...base,
      markdown: body ?? input.summary,
      bodyState: body ? "full" : input.summary ? "summary" : "unavailable",
      note: "这篇还没译，点上面的「译文」。",
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
