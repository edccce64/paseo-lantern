import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const subscriptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  addedAt: z.string(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export const subsListRpc = defineRpc({
  name: "lantern.subs.list",
  input: z.object({}),
  output: z.object({ items: z.array(subscriptionSchema) }),
});

export const subsAddRpc = defineRpc({
  name: "lantern.subs.add",
  input: z.object({ url: z.string().min(1), title: z.string().optional() }),
  output: z.object({ item: subscriptionSchema }),
});

export const subsRemoveRpc = defineRpc({
  name: "lantern.subs.remove",
  input: z.object({ id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
});

export const subsRenameRpc = defineRpc({
  name: "lantern.subs.rename",
  input: z.object({ id: z.string().min(1), title: z.string().min(1) }),
  output: z.object({ item: subscriptionSchema }),
});

export const subsImportRpc = defineRpc({
  name: "lantern.subs.import",
  input: z.object({ opml: z.string().min(1) }),
  output: z.object({
    added: z.number(),
    skipped: z.number(),
    items: z.array(subscriptionSchema),
  }),
});

export const subsExportRpc = defineRpc({
  name: "lantern.subs.export",
  input: z.object({}),
  output: z.object({ opml: z.string() }),
});

/** 推荐源目录：内置的独立博客清单，有名字就有 RSS 地址 */
export const suggestEntrySchema = z.object({
  name: z.string(),
  url: z.string(),
  site: z.string().nullable(),
  tags: z.array(z.string()),
});

export const subsSuggestRpc = defineRpc({
  name: "lantern.subs.suggest",
  input: z.object({
    query: z.string().default(""),
    limit: z.number().int().min(1).max(50).default(10),
  }),
  output: z.object({ items: z.array(suggestEntrySchema) }),
});
