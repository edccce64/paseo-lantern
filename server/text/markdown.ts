import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
});

turndown.remove(["script", "style", "noscript", "iframe", "form", "input", "button"]);

function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

/** HTML 转 Markdown。用于乔木服务已抓好的正文。 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim().length === 0) return "";
  return turndown.turndown(stripComments(html)).trim();
}

/** 用 Readability 从整页 HTML 里抽正文。用于乔木服务没抓到正文时兜底。 */
export function extractFromPage(html: string): string | null {
  if (!html || html.trim().length === 0) return null;
  try {
    const { document } = parseHTML(stripComments(html));
    const reader = new Readability(document as unknown as Document, { charThreshold: 200 });
    const article = reader.parse();
    if (!article?.content) return null;
    const markdown = htmlToMarkdown(article.content);
    return markdown.length > 200 ? markdown : null;
  } catch (error) {
    console.warn("[lantern] readability failed", error);
    return null;
  }
}
