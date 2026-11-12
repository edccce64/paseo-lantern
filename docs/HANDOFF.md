# HANDOFF · paseo-lantern（提灯）

最后更新：2026-11-12 17:35

## 当前位置

**P3 已完成。** 个人订阅能加源、删源、导入导出 OPML，条目并进「我的订阅」频道。
下一步 P4：陪读。

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

## P4 计划

1. 正文底部加「陪读」按钮：写进当前工作区最近活跃 agent 的输入框，再 `focus()`。
2. 提示词模板：标题、来源、时间、链接、摘要、正文前 1500 字。
3. 找不到 agent 时给出可读提示。
4. Composer pill：插入上次在读的文章。
