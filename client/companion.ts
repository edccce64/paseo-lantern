import type { FeedItem } from "../shared/feed";

/** AI 陪读提示词：只给来源与链接，正文和摘要由 agent 自己抓。 */
export function buildCompanionPrompt(item: FeedItem, extra = ""): string {
  const lines = [
    "帮我阅读这篇文章，先讲清楚背景和关键概念，再讲清楚对普通人的影响是什么。",
    "不确定的术语或专有名词查清楚告诉我。引用原文要标出处。抓取原文链接原文再回答。",
    "",
    `标题：${item.title}`,
    `来源：${item.origin}`,
    `链接：${item.url}`,
  ];

  if (extra.trim()) {
    lines.push("", "额外要求：", extra.trim());
  }

  return `${lines.join("\n")}\n`;
}
