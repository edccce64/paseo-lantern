import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";
import { feedItemSchema } from "./feed";

/**
 * 已读与收藏，存 host settings（跨设备跟着 host 走）。
 * - read 只存 `${source}:${id}`，最多留最后 500 条，避免无限长。
 * - star 存整条 FeedItem 快照，「收藏」频道不联网也能渲染。
 */
export const lanternStateSettings = defineSettings({
  id: "lantern-state",
  scope: "host",
  version: 1,
  schema: z.object({
    read: z.array(z.string()).default([]),
    star: z.array(feedItemSchema).default([]),
  }),
});

export type LanternState = z.infer<typeof lanternStateSettings.schema>;

export const EMPTY_STATE: LanternState = { read: [], star: [] };

export function itemKey(item: { source: string; id: string }): string {
  return `${item.source}:${item.id}`;
}

export const MAX_READ_ENTRIES = 500;
