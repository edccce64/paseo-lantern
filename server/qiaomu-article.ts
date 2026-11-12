import type { ArticleResult, ArticleVersion } from "../shared/article";
import { readCache, writeCache } from "./cache";
import { getJson } from "./sources/http";
import { sourceNames } from "./sources/qiaomu";
import { extractFromPage, htmlToMarkdown } from "./text/markdown";

const ENTRY_TTL_MS = 30 * 60 * 1000;
const BODY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_TIMEOUT_MS = 20_000;

type QiaomuEntry = {
  id: string;
  sourceId?: string;
  title?: string;
  titleZh?: string | null;
  link?: string;
  published?: string;
  publishedTs?: number;
  summary?: string | null;
  summaryZh?: string | null;
  content?: string | null;
  originalFetchError?: string | null;
};

type EntryResponse = {
  entry?: QiaomuEntry;
  rewrite?: { title?: string; body?: string } | null;
  readingState?: { rewrite?: { status?: string } };
};

type TranslationResponse = { translation?: string | null; status?: string };

type TextCache = { markdown: string };

async function loadEntry(id: string): Promise<EntryResponse> {
  const key = `qiaomu-entry-${id}`;
  const cached = await readCache<EntryResponse>(key);
  if (cached && Date.now() - cached.fetchedAt < ENTRY_TTL_MS) return cached.data;

  const response = await getJson<EntryResponse>(
    `https://rss.qiaomu.ai/api/entry/${id}`,
    cached?.etag ?? null,
  );
  if (response.kind === "ok") {
    await writeCache(key, { data: response.data, etag: response.etag, fetchedAt: Date.now() });
    return response.data;
  }
  if (response.kind === "not-modified" && cached) return cached.data;
  if (cached) return cached.data;
  throw new Error(response.kind === "rate-limited" ? "乔木服务限流，稍后再试" : "乔木服务返回异常");
}

async function loadTranslation(id: string): Promise<TranslationResponse> {
  const key = `qiaomu-translation-${id}`;
  const cached = await readCache<TranslationResponse>(key);
  if (cached && Date.now() - cached.fetchedAt < ENTRY_TTL_MS) return cached.data;
  try {
    const response = await getJson<TranslationResponse>(
      `https://rss.qiaomu.ai/api/entry/${id}/translation`,
      cached?.etag ?? null,
    );
    if (response.kind === "ok") {
      await writeCache(key, {
        data: response.data,
        etag: response.etag,
        fetchedAt: Date.now(),
      });
      return response.data;
    }
  } catch (error) {
    console.warn("[lantern] translation failed", error);
  }
  return cached?.data ?? {};
}

async function loadPageMarkdown(url: string): Promise<string | null> {
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
    const html = await response.text();
    return extractFromPage(html);
  } catch (error) {
    console.warn("[lantern] article page fetch failed", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadOriginal(entry: QiaomuEntry): Promise<{ markdown: string | null; note: string | null }> {
  const key = `qiaomu-body-${entry.id}`;
  const cached = await readCache<TextCache>(key);
  if (cached && Date.now() - cached.fetchedAt < BODY_TTL_MS && cached.data.markdown) {
    return { markdown: cached.data.markdown, note: null };
  }

  const fromService = entry.content ? htmlToMarkdown(entry.content) : "";
  if (fromService.length > 200) {
    await writeCache(key, { data: { markdown: fromService }, etag: null, fetchedAt: Date.now() });
    return { markdown: fromService, note: null };
  }

  if (entry.link) {
    const fromPage = await loadPageMarkdown(entry.link);
    if (fromPage) {
      await writeCache(key, { data: { markdown: fromPage }, etag: null, fetchedAt: Date.now() });
      return { markdown: fromPage, note: "服务端没存正文，已从原文页抓取。" };
    }
  }

  if (fromService.length > 0) return { markdown: fromService, note: null };
  return { markdown: null, note: null };
}

export async function fetchQiaomuArticle(
  id: string,
  version: ArticleVersion,
): Promise<ArticleResult> {
  const payload = await loadEntry(id);
  const entry = payload.entry;
  if (!entry) throw new Error("没有找到这篇文章");

  const translation = await loadTranslation(id);
  const translated = typeof translation.translation === "string" && translation.translation.trim().length > 0;
  const rewriteBody = typeof payload.rewrite?.body === "string" ? payload.rewrite.body.trim() : "";
  const names = await sourceNames();

  const base = {
    title: entry.titleZh?.trim() || entry.title?.trim() || "(无标题)",
    origin: names.get(entry.sourceId ?? "") ?? entry.sourceId ?? "乔木精选",
    publishedAt:
      entry.published ??
      (entry.publishedTs ? new Date(entry.publishedTs).toISOString() : new Date().toISOString()),
    url: entry.link ?? "https://rss.qiaomu.ai",
    summary: entry.summaryZh?.trim() || entry.summary?.trim() || null,
    versions: { original: true, translation: translated, rewrite: rewriteBody.length > 0 },
    looksEnglish: false,
  };

  if (version === "rewrite" && rewriteBody.length > 0) {
    return { ...base, markdown: rewriteBody, bodyState: "full", note: null };
  }

  if (version === "translation") {
    if (translated) {
      return { ...base, markdown: translation.translation ?? null, bodyState: "full", note: null };
    }
    const status = translation.status ?? "unavailable";
    const original = await loadOriginal(entry);
    const note =
      status === "queued" || status === "processing" || status === "retrying"
        ? "译本还在生成，先看原文。"
        : "这篇还没有译本。";
    return {
      ...base,
      markdown: original.markdown ?? base.summary,
      bodyState: original.markdown ? "full" : base.summary ? "summary" : "unavailable",
      note,
    };
  }

  const original = await loadOriginal(entry);
  if (original.markdown) {
    return { ...base, markdown: original.markdown, bodyState: "full", note: original.note };
  }
  return {
    ...base,
    markdown: base.summary,
    bodyState: base.summary ? "summary" : "unavailable",
    note: original.note ?? "拿不到正文，点下面的按钮去原文读。",
  };
}
