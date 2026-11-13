import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RpcInput } from "@getpaseo/plugin";
import type {
  TranslateProgress,
  translateRequestRpc,
  translateStatusRpc,
} from "../shared/translate";
import { fetchPageArticle } from "./page-article";
import { readTranslation, writeTranslation } from "./translate-store";

const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
/** 每段字符上限。太长模型容易漏译，太短调用次数多。 */
const CHUNK_CHARS = 1600;
/** 同时翻几段。实测单段 1–3 秒；21 段全并发也没限流，6 路保守可用。 */
const CONCURRENCY = 6;
const CHUNK_TIMEOUT_MS = 120_000;
const JOB_KEEP_MS = 10 * 60 * 1000;
const AUTH_FILE = path.join(os.homedir(), ".pi", "agent", "auth.json");

const SYSTEM_PROMPT = [
  "你是专业译者。把用户给的 Markdown 片段译成简体中文。",
  "规则：",
  "- 保留 Markdown 结构：标题、列表、粗体、行内代码、链接与图片地址。",
  "- 术语、产品名、公司名、人名保留英文原词。",
  "- 不增删内容，不改数字、日期、引语。",
  "- 只输出译文，不要解释，不要用代码块包住整段。",
].join("\n");

type Job = {
  state: "working" | "ready" | "failed";
  done: number;
  total: number;
  error: string | null;
  finishedAt: number | null;
};

/** 翻译在后台跑，客户端轮询状态。长文要几十秒，不让 RPC 一直挂着。 */
const jobs = new Map<string, Job>();

function prune(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (job.finishedAt && now - job.finishedAt > JOB_KEEP_MS) jobs.delete(id);
  }
}

function progressOf(job: Job | null | undefined, fallback: TranslateProgress): TranslateProgress {
  if (!job) return fallback;
  return { state: job.state, done: job.done, total: job.total, error: job.error };
}

async function apiKey(): Promise<string> {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  try {
    const raw = await fs.readFile(AUTH_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, { key?: string }>;
    const key = parsed?.deepseek?.key;
    if (typeof key === "string" && key.length > 0) return key;
  } catch {
    // 往下抛统一错误
  }
  throw new Error("没找到 DeepSeek 的 key，检查 ~/.pi/agent/auth.json 的 deepseek 项");
}

function splitLong(block: string, size: number): string[] {
  const pieces: string[] = [];
  let rest = block;
  while (rest.length > size) {
    const window = rest.slice(0, size);
    const cut = Math.max(
      window.lastIndexOf("。"),
      window.lastIndexOf(". "),
      window.lastIndexOf("\n"),
      window.lastIndexOf("！"),
      window.lastIndexOf("? "),
    );
    const at = cut > size / 2 ? cut + 1 : size;
    pieces.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  if (rest.trim().length > 0) pieces.push(rest);
  return pieces;
}

/** 按空行切块，保证 Markdown 段落不被切断。 */
export function splitChunks(markdown: string, size: number): string[] {
  const blocks = markdown.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const block of blocks) {
    if (block.length > size) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitLong(block, size));
      continue;
    }
    if (current.length + block.length + 2 > size) {
      if (current) chunks.push(current);
      current = block;
      continue;
    }
    current = current ? `${current}\n\n${block}` : block;
  }

  if (current) chunks.push(current);
  return chunks;
}

async function callDeepSeek(key: string, chunk: string, index: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHUNK_TIMEOUT_MS);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 8192,
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          // 不要把「第几段」写进正文，模型会把它当正文一起输出
          { role: "user", content: chunk },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`翻译接口返回 ${response.status}${response.status === 401 ? "，key 可能失效" : ""}`);
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error(`第 ${index} 段没译出来`);
    }
    // 保险：万一模型自己加了段号，去掉
    return text.trim().replace(/^第\s*\d+\s*\/\s*\d+\s*段[:：]?\s*/, "");
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`第 ${index} 段超时，可能网络慢`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** 429 或 5xx 重试一次，避免并发把偶发错误放大 */
async function callWithRetry(key: string, chunk: string, index: number): Promise<string> {
  try {
    return await callDeepSeek(key, chunk, index);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/返回 (429|5\d\d)/.test(message)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return callDeepSeek(key, chunk, index);
  }
}

async function run(
  input: { id: string; url: string; title: string; origin?: string; publishedAt?: string; summary?: string | null },
  job: Job,
): Promise<void> {
  try {
    const article = await fetchPageArticle({
      id: input.id,
      url: input.url,
      title: input.title,
      origin: input.origin ?? "订阅",
      publishedAt: input.publishedAt ?? new Date().toISOString(),
      summary: input.summary ?? null,
    });

    const body = article.markdown?.trim() ?? "";
    if (body.length < 200) throw new Error("正文太短，先等正文出来再翻");

    const chunks = splitChunks(body, CHUNK_CHARS);
    job.total = chunks.length;
    const key = await apiKey();

    const parts: string[] = new Array(chunks.length).fill("");
    let cursor = 0;
    let failed = false;

    async function worker(): Promise<void> {
      while (!failed && cursor < chunks.length) {
        const index = cursor;
        cursor += 1;
        try {
          parts[index] = await callWithRetry(key, chunks[index], index + 1);
          job.done += 1;
        } catch (error) {
          // 一段失败就停，不再开新段；在途的段会自己跑完
          failed = true;
          throw error;
        }
      }
    }

    const workers = Math.min(CONCURRENCY, chunks.length);
    await Promise.all(Array.from({ length: workers }, worker));

    const markdown = parts.join("\n\n").trim();
    if (markdown.length < 50) throw new Error("译文太短，可能没译成");

    await writeTranslation(input.id, {
      title: article.title,
      url: article.url,
      markdown,
      model: MODEL,
      chunks: chunks.length,
      sourceChars: body.length,
      translatedAt: new Date().toISOString(),
    });
    job.state = "ready";
    job.finishedAt = Date.now();
  } catch (error) {
    job.state = "failed";
    job.error = error instanceof Error ? error.message : "翻译失败";
    job.finishedAt = Date.now();
    console.warn(`[lantern] translate failed: ${job.error}`);
  }
}

export async function requestTranslate(
  input: RpcInput<typeof translateRequestRpc>,
): Promise<TranslateProgress> {
  prune();

  const cached = await readTranslation(input.id);
  if (cached) return { state: "ready", done: cached.chunks, total: cached.chunks, error: null };

  const running = jobs.get(input.id);
  if (running?.state === "working") return progressOf(running, { state: "working", done: 0, total: 0, error: null });
  if (running?.state === "failed") jobs.delete(input.id);

  const job: Job = { state: "working", done: 0, total: 0, error: null, finishedAt: null };
  jobs.set(input.id, job);
  void run(input, job);
  return progressOf(job, { state: "working", done: 0, total: 0, error: null });
}

export async function statusTranslate(
  { id }: RpcInput<typeof translateStatusRpc>,
): Promise<TranslateProgress> {
  prune();

  const cached = await readTranslation(id);
  if (cached) return { state: "ready", done: cached.chunks, total: cached.chunks, error: null };

  const job = jobs.get(id);
  if (job) return progressOf(job, { state: "missing", done: 0, total: 0, error: null });

  return { state: "missing", done: 0, total: 0, error: null };
}
