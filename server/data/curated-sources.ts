// 人工挑选的推荐源。与 blog-catalog.ts 分开维护，因为那份文件是脚本生成的，重新生成会覆盖。
// 每条都在 2026-11-15 用插件自己的 User-Agent 实测过：HTTP 200 且有条目。
import type { CatalogEntry } from "./blog-catalog";

export const CURATED_SOURCES: CatalogEntry[] = [
  {
    name: "GitHub 每日趋势",
    url: "https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml",
    site: "https://github.com/trending",
    tags: ["GitHub", "开源", "AI", "工具"],
  },
  {
    name: "GitHub 官方博客",
    url: "https://github.blog/feed/",
    site: "https://github.blog/",
    tags: ["GitHub", "教程", "产品更新"],
  },
  {
    name: "Simon Willison",
    url: "https://simonwillison.net/atom/everything/",
    site: "https://simonwillison.net/",
    tags: ["AI", "工具", "教程", "英文"],
  },
  {
    name: "Hacker News 首页",
    url: "https://hnrss.org/frontpage",
    site: "https://news.ycombinator.com/",
    tags: ["技术", "社区", "英文"],
  },
  {
    name: "Show HN",
    url: "https://hnrss.org/show",
    site: "https://news.ycombinator.com/show",
    tags: ["新工具", "开源", "英文"],
  },
  {
    name: "DEV Community",
    url: "https://dev.to/feed",
    site: "https://dev.to/",
    tags: ["开发", "教程", "英文"],
  },
  {
    name: "Product Hunt",
    url: "https://www.producthunt.com/feed",
    site: "https://www.producthunt.com/",
    tags: ["新产品", "工具", "英文"],
  },
  {
    name: "V2EX",
    url: "https://www.v2ex.com/index.xml",
    site: "https://www.v2ex.com/",
    tags: ["技术", "社区", "中文"],
  },
  {
    name: "量子位",
    url: "https://www.qbitai.com/feed",
    site: "https://www.qbitai.com/",
    tags: ["AI", "资讯", "中文"],
  },
  {
    name: "少数派",
    url: "https://sspai.com/feed",
    site: "https://sspai.com/",
    tags: ["工具", "效率", "教程", "中文"],
  },
  {
    name: "爱范儿",
    url: "https://www.ifanr.com/feed",
    site: "https://www.ifanr.com/",
    tags: ["科技", "产品", "中文"],
  },
  {
    name: "InfoQ 中文",
    url: "https://www.infoq.cn/feed",
    site: "https://www.infoq.cn/",
    tags: ["开发", "架构", "中文"],
  },
  {
    name: "Google AI 博客",
    url: "https://blog.google/technology/ai/rss/",
    site: "https://blog.google/technology/ai/",
    tags: ["AI", "官方", "英文"],
  },
  {
    name: "OpenAI 新闻",
    url: "https://openai.com/news/rss.xml",
    site: "https://openai.com/news/",
    tags: ["AI", "官方", "英文"],
  },
  {
    name: "Reddit r/LocalLLaMA",
    url: "https://www.reddit.com/r/LocalLLaMA/.rss",
    site: "https://www.reddit.com/r/LocalLLaMA/",
    tags: ["AI", "开源模型", "社区", "英文"],
  },
];
