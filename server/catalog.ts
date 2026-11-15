import { BLOG_CATALOG, type CatalogEntry } from "./data/blog-catalog";
import { CURATED_SOURCES } from "./data/curated-sources";

/**
 * 推荐源目录 = 人工挑选的精选源 + 独立博客目录。
 * 精选源排在前面，打开「发现」第一屏就能看到。按地址去重，保留先出现的条目。
 */
const ALL_SOURCES: CatalogEntry[] = (() => {
  const seen = new Set<string>();
  const merged: CatalogEntry[] = [];
  for (const entry of [...CURATED_SOURCES, ...BLOG_CATALOG]) {
    const key = entry.url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }
  return merged;
})();

/**
 * 按名字、RSS 地址、标签过滤内置目录。
 * 排序：名字开头匹配 > 名字包含 > 标签或地址包含。
 * query 为空时返回前 limit 条，用于“打开就看得到一些推荐”。
 */
export function suggestSources(query: string, limit: number): CatalogEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return ALL_SOURCES.slice(0, limit);

  const scored: Array<{ entry: CatalogEntry; score: number }> = [];
  for (const entry of ALL_SOURCES) {
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
