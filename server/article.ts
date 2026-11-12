import type { RpcInput } from "@getpaseo/plugin";
import type { ArticleResult } from "../shared/article";
import { articleRpc } from "../shared/article";
import { fetchPageArticle } from "./page-article";
import { fetchQiaomuArticle } from "./qiaomu-article";

export async function getArticle({
  id,
  url,
  title,
  origin,
  publishedAt,
  summary,
  version,
}: RpcInput<typeof articleRpc>): Promise<ArticleResult> {
  if (typeof url === "string" && url.length > 0) {
    return fetchPageArticle({
      id,
      url,
      title: title ?? url,
      origin: origin ?? "订阅",
      publishedAt: publishedAt ?? new Date().toISOString(),
      summary: summary ?? null,
    });
  }
  return fetchQiaomuArticle(id, version ?? "original");
}
