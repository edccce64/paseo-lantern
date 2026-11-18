import type { ArticleResult, ArticleVersion } from "../shared/article";
import { readCache, writeCache } from "./cache";
import { getText } from "./sources/http";
import { isMostlyEnglish } from "./text/lang";
import { readTranslation } from "./translate-store";

const TTL_MS = 24 * 60 * 60 * 1000;
const CANDIDATES = ["README.md", "readme.md", "README", "Readme.md", "README.markdown"];

type GithubArticleInput = {
  id: string;
  url: string;
  title: string;
  origin: string;
  publishedAt: string;
  summary: string | null;
  version?: ArticleVersion;
};

function cacheKey(owner: string, repo: string): string {
  return `github-readme-${owner}-${repo}`.replace(/[^a-zA-Z0-9._-]/g, "-");
}

/** 从 `github:owner/repo` 或仓库链接里取 owner 与 repo */
function parseRepo(input: { id: string; url: string }): { owner: string; repo: string } | null {
  if (input.id.startsWith("github:")) {
    const [owner, repo] = input.id.slice("github:".length).split("/");
    if (owner && repo) return { owner, repo };
  }
  const match = /github\.com\/([^/]+)\/([^/?#]+)/.exec(input.url);
  if (!match) return null;
  return { owner: match[1]!, repo: match[2]!.replace(/\.git$/, "") };
}

/**
 * README 里的相对链接换成绝对地址，并把常见的 HTML 图片与链接转成 Markdown。
 * 不处理的话，徽章与截图会变成坏图或一串原文 HTML。
 */
function absolutize(markdown: string, owner: string, repo: string): { text: string; images: number } {
  let images = 0;
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/`;
  const blobBase = `https://github.com/${owner}/${repo}/blob/HEAD/`;
  const toRaw = (src: string) =>
    /^https?:|^data:/.test(src) ? src : `${rawBase}${src.replace(/^\.\//, "")}`;
  const toBlob = (href: string) =>
    /^https?:|^mailto:|^#/.test(href) ? href : `${blobBase}${href.replace(/^\.\//, "")}`;

  let text = markdown
    // HTML 图片 → Markdown
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const src = /src\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
      if (!src) return "";
      images += 1;
      const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
      return `![${alt}](${toRaw(src)})`;
    })
    // HTML 链接 → Markdown
    .replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
      return `[${String(label).trim()}](${toBlob(String(href))})`;
    })
    // 其余标签去掉，<br> 与 </p> 当换行
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    // 图片：![alt](path)
    .replace(/!\[([^\]]*)\]\((?!https?:|data:|#)([^)\s]+)(\s+"[^"]*")?\)/g, (_m, alt, src, title) => {
      images += 1;
      return `![${alt}](${toRaw(String(src))}${title ?? ""})`;
    })
    // 链接：[text](path)
    .replace(/(?<!!)\[([^\]]*)\]\((?!https?:|mailto:|#)([^)\s]+)(\s+"[^"]*")?\)/g, (_m, label, href, title) => {
      return `[${label}](${toBlob(String(href))}${title ?? ""})`;
    });

  // README 里常见的实体
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return { text, images };
}

async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  for (const name of CANDIDATES) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${name}`;
    try {
      const response = await getText(url, null);
      if (response.kind === "rate-limited") return null;
      if (response.kind === "ok" && response.text.trim()) return response.text;
    } catch {
      // 这个名字不存在，换下一个
    }
  }
  return null;
}

/** 收藏的 GitHub 项目：正文是仓库 README */
export async function fetchGithubArticle(input: GithubArticleInput): Promise<ArticleResult> {
  const repo = parseRepo({ id: input.id, url: input.url });
  const empty: ArticleResult = {
    title: input.title,
    origin: input.origin,
    publishedAt: input.publishedAt,
    url: input.url,
    markdown: null,
    bodyState: "unavailable",
    summary: input.summary,
    versions: { original: false, translation: false, rewrite: false },
    looksEnglish: false,
    note: null,
  };
  if (!repo) return { ...empty, note: "认不出这个仓库地址" };

  const key = cacheKey(repo.owner, repo.repo);
  const cached = await readCache<{ markdown: string }>(key);

  let body: string | null = null;
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    body = cached.data.markdown;
  } else {
    try {
      const raw = await fetchReadme(repo.owner, repo.repo);
      if (!raw) return { ...empty, note: "这个仓库没有 README" };
      const { text } = absolutize(raw, repo.owner, repo.repo);
      await writeCache(key, { data: { markdown: text }, etag: null, fetchedAt: Date.now() });
      body = text;
    } catch (error) {
      if (!cached) throw error;
      body = cached.data.markdown;
    }
  }

  const translation = await readTranslation(input.id);
  const base: ArticleResult = {
    ...empty,
    markdown: body,
    bodyState: "full",
    versions: { original: true, translation: translation !== null, rewrite: false },
    looksEnglish: body ? isMostlyEnglish(body) : false,
  };

  if (input.version === "translation") {
    if (translation) {
      return { ...base, markdown: translation.markdown, note: "来自仓库 README 的译文" };
    }
    return { ...base, note: "这篇还没译，点上面的「译文」。" };
  }

  return { ...base, note: "来自仓库 README" };
}
