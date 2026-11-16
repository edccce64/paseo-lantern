import { articleToMarkdown } from "../text/draftjs";

/**
 * X（Twitter）链接的正文抓取。
 *
 * x.com 的页面要登录，直接抓只能拿到登录墙。FxTwitter 是第三方匿名 API，
 * 不需要登录、不需要 key，能拿到长推文全文与 X Article 的完整正文。
 */

const API_BASE = "https://api.fxtwitter.com";
const TIMEOUT_MS = 20_000;

/** x.com/<handle>/status/<id>、x.com/i/status/<id>、twitter.com/… 都算 */
const X_STATUS_RE = /(?:x|twitter)\.com\/(?:[A-Za-z0-9_]+\/status|i\/(?:web\/)?status)\/(\d+)/i;

export function isXStatusUrl(url: string): boolean {
  return X_STATUS_RE.test(url);
}

export function parseXStatusId(url: string): string | null {
  const match = X_STATUS_RE.exec(url);
  return match ? match[1] : null;
}

export type XPost = {
  /** Article 标题。普通推文没有标题 */
  title: string | null;
  /** Markdown 正文 */
  markdown: string;
};

/** 抓一条 X 帖子的正文。抓不到返回 null，调用方决定回退。 */
export async function fetchXPost(url: string): Promise<XPost | null> {
  const id = parseXStatusId(url);
  if (!id) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/status/${id}`, {
      headers: {
        accept: "application/json",
        "user-agent": "paseo-lantern/0.1 (+https://paseo.sh)",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      tweet?: {
        text?: string;
        article?: {
          title?: string;
          content?: { blocks?: unknown[] };
          media_entities?: unknown[];
        };
      };
    };
    const tweet = payload.tweet;
    if (!tweet) return null;

    const article = tweet.article;
    if (article?.content?.blocks) {
      const markdown = articleToMarkdown({
        content: article.content as never,
        media_entities: article.media_entities as never,
      });
      if (markdown) return { title: article.title ?? null, markdown };
    }

    const text = (tweet.text ?? "").trim();
    if (!text) return null;
    return { title: null, markdown: text };
  } catch (error) {
    console.warn("[lantern] fxtwitter fetch failed", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
