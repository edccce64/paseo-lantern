import type { FeedItem } from "../shared/feed";

/** AI 陪读提示词（文章）：只给来源与链接，正文和摘要由 agent 自己抓。 */
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

/**
 * AI 陪读提示词（GitHub 仓库）：不按文章讲，按「是什么 / 对我有什么用 / 怎么用 / 链接」四段讲。
 * 仓库名形如 `owner/repo`，作者取 site 或名字的前一段。
 */
export function buildRepoCompanionPrompt(item: FeedItem, extra = ""): string {
  const name = item.title;
  const owner = (item as { site?: string | null }).site ?? name.split("/")[0] ?? "";
  const lines = [
    "这个仓库是做什么的，用大白话讲，不要堆术语。",
    "",
    "请按这四段回答：",
    "",
    "一、这是什么",
    "一句话说清它是什么、解决哪些人的什么问题。然后补两三句：核心做法是什么，和同类工具比它凭什么不一样。",
    "",
    "二、对我有什么用",
    "结合我的情况说清楚：哪些场景能直接用上，能省掉什么活；哪些场景用不上，别硬套。",
    "",
    "三、怎么用",
    "分步骤写，一步一个动作，从零开始：",
    "1. 前提：需要装什么、要什么账号或 key。",
    "2. 安装或获取：给出具体命令或下载入口。",
    "3. 第一次跑通：给出最小可用示例。",
    "4. 常见配置：最可能需要改的两三项。",
    "每步写清「做什么」和「做完应该看到什么」。命令放代码块里。",
    "",
    "四、链接",
    "官方主页、文档、安装页，一行一个。",
    "",
    "要求：",
    "- 先读仓库 README 再回答，不要凭仓库名猜。",
    "- 专业名词第一次出现时，用一句人话解释。",
    "- 不确定的地方直说要查文档，不要编。",
    "- 全文用简体中文，命令、产品名、仓库名保留原文。",
    "",
    `仓库：${name}`,
    `作者：${owner}`,
    `语言：${item.origin}`,
    `链接：${item.url}`,
  ];

  if (extra.trim()) {
    lines.push("", "额外要求：", extra.trim());
  }

  return `${lines.join("\n")}\n`;
}

/** 按条目类型选提示词：仓库走四段版，其余走文章版 */
export function companionPromptFor(item: FeedItem): string {
  return item.source === "github" ? buildRepoCompanionPrompt(item) : buildCompanionPrompt(item);
}
