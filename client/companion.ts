import type { FeedItem } from "../shared/feed";

const MAX_BODY_CHARS = 1500;

/** 陪读提示词。固定部分写死，用户额外要求在设置里加。 */
export function buildCompanionPrompt(
  item: FeedItem,
  body: string | null,
  extra = "",
): string {
  const excerpt = (body ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_BODY_CHARS);
  const lines = [
    "陪我读这篇文章。先讲背景和关键概念，再解释我不懂的地方。",
    "不确定的术语先查证再说；引用原文要标出处；用中文回答。",
    "如果下面的正文不完整，用工具抓链接原文再回答。",
    "",
    `标题：${item.title}`,
    `来源：${item.origin}　发布：${formatWhen(item.publishedAt)}`,
    `链接：${item.url}`,
  ];

  if (item.summary) {
    lines.push(`摘要：${item.summary}`);
  }

  if (excerpt) {
    lines.push("", "正文（可能有截断）：", excerpt);
  }

  if (extra.trim()) {
    lines.push("", "额外要求：", extra.trim());
  }

  return `${lines.join("\n")}\n`;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${date.getFullYear()}年${month}月${day}日`;
}
