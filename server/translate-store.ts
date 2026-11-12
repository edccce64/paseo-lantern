import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { CACHE_DIR } from "./cache";

export const TRANSLATE_DIR = path.join(CACHE_DIR, "translations");

/** 条目 id 可能是 URL 或带冒号的 tag，文件名用短哈希。 */
export function translateKey(id: string): string {
  return crypto.createHash("sha1").update(id).digest("hex").slice(0, 16);
}

export type TranslationFile = {
  title: string;
  url: string;
  markdown: string;
  model: string;
  chunks: number;
  sourceChars: number;
  translatedAt: string;
};

function fileFor(id: string): string {
  return path.join(TRANSLATE_DIR, `${translateKey(id)}.json`);
}

export async function readTranslation(id: string): Promise<TranslationFile | null> {
  try {
    const raw = await fs.readFile(fileFor(id), "utf8");
    const parsed = JSON.parse(raw) as TranslationFile;
    return typeof parsed?.markdown === "string" && parsed.markdown.trim().length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeTranslation(id: string, value: TranslationFile): Promise<void> {
  await fs.mkdir(TRANSLATE_DIR, { recursive: true });
  const file = fileFor(id);
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value), "utf8");
  await fs.rename(temp, file);
}
