# HANDOFF · paseo-lantern（提灯）

最后更新：2026-11-12 18:00

## 当前位置

**P4 已完成（发送前有确认弹窗）。** 正文页底部「陪读」→ 弹窗显示目标 agent 与提示词 → 确认后发送。
下一步 P5：乔木缺失中文版时由 agent 生成。

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
| `index.server.ts` | 注册 9 个 RPC |
| `client/screen.tsx` | 频道 chips、状态行、列表；点条目切到正文 |
| `client/article.tsx` | 正文视图：返回、标题、版本 chips、Markdown、打开原文 |
| `client/subs-panel.tsx` | 订阅管理弹窗：列表、加源、删源、导入导出 OPML |
| `client/item.tsx` | 侧边栏行 |
| `shared/feed.ts` | 四个频道、条目 schema、四态取数 |
| `shared/article.ts` | 正文契约 |
| `shared/subs.ts` | 订阅契约 |
| `server/feed.ts` | 列表分发（含 mine） |
| `server/mine.ts` | 个人订阅抓取与合并 |
| `server/subs.ts` | 订阅文件读写、OPML |
| `server/feeds/parse.ts` | RSS/Atom/RDF 解析、OPML 解析与生成 |
| `server/qiaomu-article.ts` | 乔木正文与版本 |
| `server/page-article.ts` | 订阅条目的正文抽取 |
| `server/text/markdown.ts` | HTML→Markdown、Readability |
| `server/sources/*.ts` | AIHOT、乔木、HTTP 与缓存 |

## 个人订阅（P3）

- 订阅存 `%USERPROFILE%\.paseo\data\paseo-lantern\subscriptions.json`，原子写。
- 加源时先抓一次，标题取 feed 自带的 title；地址必须是 http(s)。
- 导入 OPML：粘贴文本。嵌套分组会摊平，重复地址跳过。
- 导出 OPML：复制到剪贴板。
- 抓取是懒加载：打开「我的订阅」或点刷新时，超过 15 分钟的源才重抓，并发 3。
- 每源保留最新 200 条，条目按发布时间倒序合并。
- 单源失败只影响自己，状态行标「离线缓存」。

## 正文取法

乔木：

1. `/api/entry/:id` 的 `entry.content` 就是正文 HTML，30 分钟缓存。
2. turndown 转 Markdown，存 `qiaomu-body-<id>`，7 天。
3. content 为空或太短时抓原文页，Readability 抽正文。
4. 改写用 `rewrite.body`（本身是 Markdown）。译文接口按 `status` 区分「还在生成」和「没有」。

AIHOT：没有正文接口，只显示摘要。

个人订阅：抓原文页，Readability 抽取，缓存 7 天，键名 `page-<base64url>`。

## 验证记录

P1：

- 已验证：三个频道拉到真实数据；304 走「已是最新」；缓存落盘。
- 未验证：真断网时的 `stale` 分支。

P2：

- 已验证：乔木正文渲染正常（段落、标题、加粗、代码块、链接）；版本切换可用；译文不可用时 chip 变淡。
- 已验证：AIHOT 条目显示摘要与说明。
- 未验证：Readability 兜底分支。

P3：

- 已验证：加 `https://www.ruanyifeng.com/blog/atom.xml`，标题自动取到「阮一峰的网络日志」。
- 已验证：导入含 1 新 1 重复的 OPML → 新增 1、跳过 1。
- 已验证：导出 OPML → 剪贴板得到合法 OPML，中文标题完整。
- 已验证：我的订阅合并两个源，按时间倒序，来源分别标出。
- 已验证：订阅条目点进去，正文从原文页抽取并显示（含封面图）。
- 已验证：删除订阅后列表更新。
- 未验证：iPhone 上的订阅弹窗手感；订阅很多时的抓取耗时。

## 遗留

1. 正文缓存没有容量上限与淘汰（SPEC 写 100 篇 / 30 天）。
2. 订阅条目的正文页没有版本切换（对个人源本就没有）。
3. 桌面自动化点长中文可访问名会编码失败，改用坐标点击。

## 陪读（P4）

- 0.15.4 没有 composer 写入 API（`useComposers` 只在 0.16 beta）。所以走「预览 + 发送」。
- 点「陪读」→ `paseo.agents.list({ scope: "active", sort: [{ key: "updated_at", direction: "desc" }], page: { limit: 5 } })` 取最近活跃 agent。
- 弹窗显示目标 agent 名与完整提示词（可滚动），确认后 `paseo.agents.ref(id).send(prompt)`。
- 找不到 agent 时弹窗里给可读提示，发送按钮禁用。
- 提示词在 `client/companion.ts`：固定要求 + 标题、来源、日期、链接、摘要、正文前 1500 字。

## 验证记录（P4）

- 已验证：正文底部出现「陪读」「原文」两个按钮。
- 已验证：点「陪读」弹窗打开，正确解析到最近活跃 agent（显示其标题），提示词预览内容完整。
- 已验证：取消能关闭弹窗。
- 未验证：点「发送」的真实投递。目标 agent 就是当前这次会话，真发会往正在用的会话里插一条消息，所以没点。要验的话在手机上点一次，看那个 agent 是否收到。

## P5 计划

1. 乔木中文版缺失时，点按钮让 agent 生成，产物落 `rewrites/`。
2. `fs.watch` 监听目录，出现文件即显示，标「本地生成」。
