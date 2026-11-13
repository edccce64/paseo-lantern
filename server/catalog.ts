import { BLOG_CATALOG, type CatalogEntry } from "./data/blog-catalog";

/**
 * 按名字、RSS 地址、标签过滤内置目录。
 * 排序：名字开头匹配 > 名字包含 > 标签或地址包含。
 * query 为空时返回前 limit 条，用于“打开就看得到一些推荐”。
 */
export function suggestSources(query: string, limit: number): CatalogEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return BLOG_CATALOG.slice(0, limit);

  const scored: Array<{ entry: CatalogEntry; score: number }> = [];
  for (const entry of BLOG_CATALOG) {
    const name = entry.name.toLocaleLowerCase();
    let score = 0;
    if (name.startsWith(needle)) score = 3;
    else if (name.includes(needle)) score = 2;
    else if (entry.url.toLocaleLowerCase().includes(needle)) score = 1;
    else if (entry.tags.some((tag) => tag.toLocaleLowerCase().includes(needle))) score = 1;
    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score || a.entry.name.length - b.entry.name.length);
  return scored.slice(0, limit).map((row) => row.entry);
}
