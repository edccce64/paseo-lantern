import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/**
 * 译文：个人订阅的英文正文，点一下由服务端直连翻译接口翻成中文。
 * 不经过 agent，所以不用跳会话，也不会打开任何弹窗。
 */
const progressSchema = z.object({
  /** missing：还没翻；working：正在翻；ready：有译文；failed：失败 */
  state: z.enum(["missing", "working", "ready", "failed"]),
  /** 已翻段数 */
  done: z.number(),
  /** 总段数，第一段开始前是 0 */
  total: z.number(),
  error: z.string().nullable(),
});

export const translateRequestRpc = defineRpc({
  name: "lantern.translate.request",
  input: z.object({
    id: z.string().min(1),
    url: z.string().min(1),
    title: z.string(),
    origin: z.string().optional(),
    publishedAt: z.string().optional(),
    summary: z.string().nullable().optional(),
  }),
  output: progressSchema,
});

export const translateStatusRpc = defineRpc({
  name: "lantern.translate.status",
  input: z.object({ id: z.string().min(1) }),
  output: progressSchema,
});

export type TranslateProgress = z.infer<typeof progressSchema>;
