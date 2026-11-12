import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/**
 * EDC 改写：把「我的订阅」里的英文正文交给 agent，写成一篇中文稿。
 * Paseo 0.15.4 读不到 agent 的聊天回复，所以走文件：
 * 服务端写 `<key>.src.md`，agent 写 `<key>.md`，服务端轮询后者。
 */
export const rewriteRequestRpc = defineRpc({
  name: "lantern.rewrite.request",
  input: z.object({
    id: z.string().min(1),
    url: z.string().min(1),
    title: z.string(),
    origin: z.string().optional(),
    publishedAt: z.string().optional(),
    summary: z.string().nullable().optional(),
  }),
  output: z.object({
    /** 服务端写好的英文正文文件 */
    srcPath: z.string(),
    /** 要求 agent 写出的中文稿文件 */
    outPath: z.string(),
    chars: z.number(),
  }),
});

export const rewriteStatusRpc = defineRpc({
  name: "lantern.rewrite.status",
  input: z.object({ id: z.string().min(1) }),
  output: z.object({
    /** missing：还没请求过；pending：源文件在、产物还没好；ready：产物可用 */
    state: z.enum(["missing", "pending", "ready"]),
    markdown: z.string().nullable(),
    chars: z.number(),
  }),
});

export type RewriteRequestInput = z.infer<typeof rewriteRequestRpc.input>;
export type RewriteStatus = z.infer<typeof rewriteStatusRpc.output>;
