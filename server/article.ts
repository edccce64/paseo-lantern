import type { RpcInput } from "@getpaseo/plugin";
import type { ArticleResult } from "../shared/article";
import { articleRpc } from "../shared/article";
import { fetchQiaomuArticle } from "./qiaomu-article";

export async function getArticle({
  id,
  version,
}: RpcInput<typeof articleRpc>): Promise<ArticleResult> {
  return fetchQiaomuArticle(id, version ?? "original");
}
