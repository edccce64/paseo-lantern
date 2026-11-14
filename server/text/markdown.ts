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

/* ---------- GFM 管状表格 ---------- */
/* turndown 核心不把 <table> 转成 Markdown 表格，这里补规则，输出 | a | b | 形式，供客户端解析。 */

const tableIndexOf = Array.prototype.indexOf;

/** 每张表的第一行当表头：有 thead 取 thead 首行，否则取 table 的第一个 <tr>（无表头表格也这样处理） */
function isHeadingRow(tr: any): boolean {
  let table = tr;
  while (table && table.nodeName !== "TABLE") table = table.parentNode;
  if (!table) return false;
  const rows = table.getElementsByTagName("tr");
  return rows.length > 0 && rows[0] === tr;
}

function tableCellMarkdown(content: string, node: any): string {
  const index = tableIndexOf.call(node.parentNode.childNodes, node);
  const prefix = index === 0 ? "| " : " ";
  return prefix + content + " |";
}

function tableRowMarkdown(content: string, node: any): string {
  let borderCells = "";
  const alignMap: Record<string, string> = { left: ":--", right: "--:", center: ":-:" };
  if (isHeadingRow(node)) {
    for (let i = 0; i < node.childNodes.length; i++) {
      let border = "---";
      const align = String(node.childNodes[i].getAttribute("align") || "").toLowerCase();
      if (align) border = alignMap[align] || border;
      borderCells += tableCellMarkdown(border, node.childNodes[i]);
    }
  }
  return "\n" + content + (borderCells ? "\n" + borderCells : "");
}

function tableMarkdown(content: string): string {
  // 单元格内换行会引入空行，压掉第一个，避免表格中间断开
  return "\n\n" + content.replace("\n\n", "\n") + "\n\n";
}

turndown.addRule("tableCell", { filter: ["th", "td"], replacement: tableCellMarkdown });
turndown.addRule("tableRow", { filter: "tr", replacement: tableRowMarkdown });
turndown.addRule("table", {
  filter: (node: any) => node.nodeName === "TABLE",
  replacement: tableMarkdown,
});
turndown.addRule("tableSection", {
  filter: ["thead", "tbody", "tfoot"],
  replacement: (content) => content,
});

function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

/** HTML 转 Markdown。用于乔木服务已抓好的正文。 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim().length === 0) return "";
  return turndown.turndown(stripComments(html)).trim();
}

/** 新闻站常见的样板行：抽正文时会带上，读者不需要 */
const BOILERPLATE = [
  /^in brief$/i,
  /^posted:?$/i,
  /^posted:.*$/i,
  /^share this article.*$/i,
  /^sign up .*$/i,
  /^continue reading.*$/i,
  /^read more.*$/i,
  /^related( articles| stories| reads)?:?$/i,
  /^advertisement$/i,
  /^\d{1,2}:\d{2}\s*(AM|PM)\b.*$/i,
];

/**
 * 去掉样板行，并发时间这类无信息行。
 * origin 传来源名时，来源名自己重复一遍的行也会去掉。
 */
export function cleanBoilerplate(markdown: string, origin?: string | null): string {
  if (!markdown) return "";
  const source = (origin ?? "").trim();
  const kept: string[] = [];
  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      if (kept.length > 0 && kept[kept.length - 1] !== "") kept.push("");
      continue;
    }
    if (source.length > 0 && trimmed === source) continue;
    if (BOILERPLATE.some((pattern) => pattern.test(trimmed))) continue;
    kept.push(line);
  }
  return kept.join("\n").trim();
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
