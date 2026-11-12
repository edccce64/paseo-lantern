import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/** local：agent 在本机写出的中文稿（EDC 改写），只用于「我的订阅」 */
export const articleVersionSchema = z.enum(["original", "translation", "rewrite", "local"]);

export type ArticleVersion = z.infer<typeof articleVersionSchema>;

export const articleRpc = defineRpc({
  name: "lantern.article",
  input: z.object({
    id: z.string().min(1),
    url: z.string().optional(),
    title: z.string().optional(),
    origin: z.string().optional(),
    publishedAt: z.string().optional(),
    summary: z.string().nullable().optional(),
    version: articleVersionSchema.optional(),
  }),
  output: z.object({
    title: z.string(),
    origin: z.string(),
    publishedAt: z.string(),
    url: z.string(),
    markdown: z.string().nullable(),
    /** full：有全文；summary：只有摘要；unavailable：都没有 */
    bodyState: z.enum(["full", "summary", "unavailable"]),
    summary: z.string().nullable(),
    versions: z.object({
      original: z.boolean(),
      translation: z.boolean(),
      rewrite: z.boolean(),
      local: z.boolean(),
    }),
    /** 正文以英文为主，正文页才会显示「EDC 改写」 */
    looksEnglish: z.boolean(),
    /** 例如「译本还在生成」「服务端没存正文，已从原文抓取」 */
    note: z.string().nullable(),
  }),
});

export type ArticleResult = z.infer<typeof articleRpc.output>;
