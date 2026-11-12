import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Subscription } from "../shared/subs";
import { CACHE_DIR } from "./cache";
import { buildOpml, parseOpml } from "./feeds/parse";
import { getText } from "./sources/http";
import { parseFeed } from "./feeds/parse";

const FILE = path.join(CACHE_DIR, "subscriptions.json");

function idFor(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 12);
}

function normalizeUrl(input: string): string {
  const value = input.trim();
  if (!/^https?:\/\//i.test(value)) throw new Error("地址要以 http:// 或 https:// 开头");
  return value;
}

export async function readSubs(): Promise<Subscription[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as { items?: Subscription[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeSubs(items: Subscription[]): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const temp = `${FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify({ items }, null, 2), "utf8");
  await fs.rename(temp, FILE);
}

export async function addSub(rawUrl: string, title?: string): Promise<Subscription> {
  const url = normalizeUrl(rawUrl);
  const items = await readSubs();
  const existing = items.find((item) => item.url === url);
  if (existing) return existing;

  let resolvedTitle = title?.trim() ?? "";
  if (!resolvedTitle) {
    const response = await getText(url, null);
    if (response.kind !== "ok") throw new Error("拿不到这个地址的内容");
    resolvedTitle = parseFeed(response.text).title;
  }

  const item: Subscription = {
    id: idFor(url),
    title: resolvedTitle || url,
    url,
    addedAt: new Date().toISOString(),
  };
  await writeSubs([...items, item]);
  return item;
}

export async function removeSub(id: string): Promise<boolean> {
  const items = await readSubs();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  await writeSubs(next);
  return true;
}

export async function renameSub(id: string, title: string): Promise<Subscription> {
  const items = await readSubs();
  const target = items.find((item) => item.id === id);
  if (!target) throw new Error("没有这个订阅");
  target.title = title.trim() || target.title;
  await writeSubs(items);
  return target;
}

export async function importSubs(opml: string): Promise<{
  added: number;
  skipped: number;
  items: Subscription[];
}> {
  const outlines = parseOpml(opml);
  const items = await readSubs();
  const known = new Set(items.map((item) => item.url));
  let added = 0;
  let skipped = 0;

  for (const outline of outlines) {
    let url: string;
    try {
      url = normalizeUrl(outline.xmlUrl);
    } catch {
      skipped += 1;
      continue;
    }
    if (known.has(url)) {
      skipped += 1;
      continue;
    }
    items.push({
      id: idFor(url),
      title: outline.title.trim() || url,
      url,
      addedAt: new Date().toISOString(),
    });
    known.add(url);
    added += 1;
  }

  if (added > 0) await writeSubs(items);
  return { added, skipped, items };
}

export async function exportSubs(): Promise<string> {
  const items = await readSubs();
  const known = new Set<string>();
  const unique = items.filter((item) => {
    if (known.has(item.url)) return false;
    known.add(item.url);
    return true;
  });
  return buildOpml(unique.map((item) => ({ title: item.title, url: item.url })));
}
