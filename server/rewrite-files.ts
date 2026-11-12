import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { CACHE_DIR } from "./cache";

export const REWRITE_DIR = path.join(CACHE_DIR, "rewrites");

/** 订阅条目的 id 可能是 URL 或带冒号的 tag，文件名改用短哈希。 */
export function rewriteKey(id: string): string {
  return crypto.createHash("sha1").update(id).digest("hex").slice(0, 16);
}

export function rewritePaths(id: string): { key: string; srcPath: string; outPath: string } {
  const key = rewriteKey(id);
  return {
    key,
    srcPath: path.join(REWRITE_DIR, `${key}.src.md`),
    outPath: path.join(REWRITE_DIR, `${key}.md`),
  };
}

async function readText(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

export async function writeSource(id: string, content: string): Promise<string> {
  await fs.mkdir(REWRITE_DIR, { recursive: true });
  const { srcPath } = rewritePaths(id);
  await fs.writeFile(srcPath, content, "utf8");
  return srcPath;
}

/** 产物少于 100 字当作没写完。 */
export async function readLocalRewrite(id: string): Promise<string | null> {
  const text = await readText(rewritePaths(id).outPath);
  const trimmed = text?.trim() ?? "";
  return trimmed.length > 100 ? trimmed : null;
}

export type RewriteState = "missing" | "pending" | "ready";

/**
 * agent 可能边写边存，1.5 秒内改过就当还没好。
 * 这个守卫只用在轮询上；正文页读产物用 readLocalRewrite。
 */
export async function readRewriteStatus(
  id: string,
): Promise<{ state: RewriteState; markdown: string | null }> {
  const { outPath, srcPath } = rewritePaths(id);
  try {
    const stat = await fs.stat(outPath);
    if (Date.now() - stat.mtimeMs >= 1500) {
      const markdown = await readLocalRewrite(id);
      if (markdown) return { state: "ready", markdown };
    }
  } catch {
    // 产物文件还不存在，往下看源文件
  }
  const source = await readText(srcPath);
  return { state: source ? "pending" : "missing", markdown: null };
}
