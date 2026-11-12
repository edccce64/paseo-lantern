# HANDOFF · paseo-lantern（提灯）

最后更新：2026-11-12 17:20

## 当前位置

**P2 已完成。** 列表点进去能读正文，乔木有原文 / 译文 / 乔木改写三档切换。
下一步 P3：个人订阅（OPML 导入导出 + 定时抓取）。

规格见 `docs/SPEC.md`。

## 命令

```bash
cd C:\Users\edcccc\.paseo\projects\paseo-lantern
npx tsc --noEmit
"D:\paseo\resources\bin\paseo.cmd" plugin reload paseo-lantern
"D:\paseo\resources\bin\paseo.cmd" plugin logs paseo-lantern
```

## 文件

| 文件 | 作用 |
| --- | --- |
| `index.client.tsx` | 屏幕 `lantern` + 侧边栏头部行 |
| `index.server.ts` | 注册 `lantern.ping` / `lantern.list` / `lantern.article` |
| `client/screen.tsx` | 频道 chips、状态行、列表；点条目切到正文视图 |
| `client/article.tsx` | 正文视图：返回、标题、版本 chips、Markdown、底部「打开原文」 |
| `client/item.tsx` | 侧边栏行 |
| `shared/feed.ts` | 频道、条目 schema、四态取数 |
| `shared/article.ts` | 正文契约 |
| `server/feed.ts` | 列表分发 |
| `server/article.ts` | 正文分发 |
| `server/qiaomu-article.ts` | 乔木正文：entry → content → 兜底抓原文页；译文与改写 |
| `server/text/markdown.ts` | HTML→Markdown；Readability 兜底 |
| `server/sources/*.ts` | AIHOT、乔木、HTTP、缓存 |

## 正文取法（乔木）

1. `/api/entry/:id` 取 entry，内含 `content`（HTML）。30 分钟缓存。
2. `content` 用 turndown 转 Markdown，存 `qiaomu-body-<id>`，7 天有效。
3. `content` 为空或太短时，抓 `entry.link` 整页，用 Readability 抽正文，提示「服务端没存正文，已从原文页抓取」。
4. 都拿不到就给摘要。
5. 改写：`rewrite.body` 本身就是 Markdown，直接用。
6. 译文：`/api/entry/:id/translation`。`status` 是 queued/processing 时提示「译本还在生成」。

AIHOT 条目没有正文接口。正文视图直接展示列表里带的摘要，提示「AIHOT 不提供单篇正文」，底部给「打开原文」。

## 导航

屏幕之间不能互相 openScreen（`PluginScreenProps` 只有 `params` 和 `navigation`，没有 openScreen）。
正文用屏幕内状态切换：`openItem` 有值就渲染 `ArticleView`，点「返回」清空。手机上相当于推入再退回。

## 验证记录（P2）

- 已验证：`npx tsc --noEmit` 退出码 0；`rg` 审计 0 命中。
- 已验证：乔木条目点进去显示正文（Markdown 段落、标题、加粗、代码块、链接都正常渲染）。
- 已验证：版本 chips 显示「原文 / 译文 / 乔木改写」；这篇译文不可用，chip 变淡且点不动；点「乔木改写」切到中文改写。
- 已验证：meta 行显示来源名（Product Hunt），不是 sourceId。
- 已验证：AIHOT 条目点进去显示摘要 + 说明 + 打开原文，没有版本 chips。
- 已验证：缓存落盘 `qiaomu-entry-*`、`qiaomu-body-*`、`qiaomu-translation-*`。
- 未验证：iPhone 上的正文阅读体验与图片加载。
- 未验证：Readability 兜底分支（本轮样本都有 content，没走到）。

## 遗留

1. 正文缓存没有容量上限与淘汰（SPEC 写的是 100 篇 / 30 天）。P7 再做。
2. 正文图片点击会打开宿主图片预览，这是 `Markdown` 组件自带行为。
3. 列表行的标题太长时两行截断，正文页标题完整显示。

## P3 计划

1. 个人订阅：OPML 导入导出、单源增删改。
2. 每源 15–30 分钟抓取，条件请求，保留 200 条。
3. 频道列表加「我的订阅」分组。
