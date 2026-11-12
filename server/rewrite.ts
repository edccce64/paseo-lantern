import type { RpcInput } from "@getpaseo/plugin";
import type { rewriteRequestRpc, rewriteStatusRpc } from "../shared/rewrite";
import { fetchPageArticle } from "./page-article";
import { readRewriteStatus, rewritePaths, writeSource } from "./rewrite-files";

const MIN_BODY_CHARS = 200;

/**
 * 把正文写成源文件，返回两个路径给客户端拼提示词。
 * 正文复用正文页那条抓取链路，所以缓存命中时不发请求。
 */
export async function requestRewrite({
  id,
  url,
  title,
  origin,
  publishedAt,
  summary,
}: RpcInput<typeof rewriteRequestRpc>): Promise<{
  srcPath: string;
  outPath: string;
  chars: number;
}> {
  const article = await fetchPageArticle({
    id,
    url,
    title,
    origin: origin ?? "订阅",
    publishedAt: publishedAt ?? new Date().toISOString(),
    summary: summary ?? null,
  });

  const body = article.markdown?.trim() ?? "";
  if (body.length < MIN_BODY_CHARS) {
    throw new Error("正文还没抓到或者太短，先等正文出来再试");
  }

  const header = [
    `# ${article.title}`,
    "",
    `来源：${article.origin}`,
    `链接：${article.url}`,
    `抓取时间：${new Date().toISOString()}`,
    "",
    "---",
    "",
  ].join("\n");

  const srcPath = await writeSource(id, `${header}${body}\n`);
  return { srcPath, outPath: rewritePaths(id).outPath, chars: body.length };
}

export async function statusRewrite({
  id,
}: RpcInput<typeof rewriteStatusRpc>): Promise<{
  state: "missing" | "pending" | "ready";
  markdown: string | null;
  chars: number;
}> {
  const status = await readRewriteStatus(id);
  return {
    state: status.state,
    markdown: status.markdown,
    chars: status.markdown?.length ?? 0,
  };
}
