import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const CHANNELS = [
  { id: "aihot-selected", title: "AIHOT 精选" },
  { id: "aihot-hot", title: "AIHOT 热点" },
  { id: "qiaomu", title: "乔木精选" },
  { id: "mine", title: "我的订阅" },
  { id: "xfeed", title: "XFeed AI" },
] as const;

export type ChannelId = (typeof CHANNELS)[number]["id"];

export const channelIdSchema = z.enum(["aihot-selected", "aihot-hot", "qiaomu", "mine", "xfeed"]);

export const feedItemSchema = z.object({
  id: z.string(),
  source: z.enum(["aihot", "qiaomu", "rss", "xfeed"]),
  title: z.string(),
  /** 来源名，例如「TechCrunch：AI（RSS）」 */
  origin: z.string(),
  /**
   * 纯站点名，例如「TechCrunch」。
   * 旧缓存与旧的收藏快照没有这个字段，按缺省处理。
   */
  site: z.string().nullable().optional(),
  summary: z.string().nullable(),
  /** 原文链接 */
  url: z.string(),
  /** 站内链接，可能为空 */
  siteUrl: z.string().nullable(),
  publishedAt: z.string(),
  /** 位置标签，例如「6 家信源」「精选」 */
  badge: z.string().nullable(),
});

export type FeedItem = z.infer<typeof feedItemSchema>;

/**
 * live：这次真的抓到了新数据
 * revalidated：服务端返回 304，内容没变
 * cached：在有效期内，直接用本地缓存，没有发请求
 * stale：请求失败，用上次的缓存兜底
 */
export const feedStateSchema = z.enum(["live", "revalidated", "cached", "stale"]);

export type FeedState = z.infer<typeof feedStateSchema>;

export const listRpc = defineRpc({
  name: "lantern.list",
  input: z.object({
    channel: channelIdSchema,
    limit: z.number().int().min(1).max(100).optional(),
    force: z.boolean().optional(),
  }),
  output: z.object({
    items: z.array(feedItemSchema),
    fetchedAt: z.string(),
    state: feedStateSchema,
  }),
});

export type ListResult = z.infer<typeof listRpc.output>;
