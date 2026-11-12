# HANDOFF · paseo-lantern（提灯）

最后更新：2026-11-12 22:40
当前版本：P4 完成。个人订阅的「译文」服务端已验证，界面未实测。

---

## 1. 这是什么

一个 Paseo 插件，名字叫「提灯」。

在 Paseo 里读新闻：AIHOT 精选、AIHOT 热点、乔木精选、我的订阅。读到不懂的地方，点「陪读」把文章交给 agent 解释。

- 规格书：`docs/SPEC.md`
- 项目目录：`C:\Users\edcccc\.paseo\projects\paseo-lantern`
- 插件 id：`paseo-lantern`
- 侧边栏位置：头部组，Idealoft 下方

---

## 2. 每次开工先跑这两条

```bash
cd C:\Users\edcccc\.paseo\projects\paseo-lantern
npx tsc --noEmit
"D:\paseo\resources\bin\paseo.cmd" plugin reload paseo-lantern
```

`paseo` 不在 PATH，必须写全路径 `D:\paseo\resources\bin\paseo.cmd`。

其他常用：

```bash
"D:\paseo\resources\bin\paseo.cmd" plugin ls paseo-lantern      # 看状态，要 running
"D:\paseo\resources\bin\paseo.cmd" plugin logs paseo-lantern     # 看日志
rg -n "document\.|window\.|localStorage|navigator\.|<[a-z]+[ >]|className=|onClick=" client/   # 必须 0 命中
```

---

## 3. 现在能做什么

| 能力 | 状态 |
| --- | --- |
| 侧边栏进入「提灯」全屏页 | 已完成 |
| 四个频道：AIHOT 精选 / AIHOT 热点 / 乔木精选 / 我的订阅 | 已完成 |
| 列表点开正文，Markdown 渲染 | 已完成 |
| 乔木版本切换：原文 / 译文 / 乔木改写 | 已完成 |
| 个人订阅：加源、删源、导入导出 OPML | 已完成 |
| 陪读：弹窗确认后发给最近活跃 agent | 已完成（已实测发送） |
| 译文：「我的订阅」英文正文点一下，服务端直连 DeepSeek 翻成中文 | 部分完成（服务端已验证，界面未实测） |

## 4. 还没做

| 项 | 原计划 | 说明 |
| --- | --- | --- |
| P6 已读 / 收藏 / 跨设备同步 | 存 host settings | 未开始 |
| P6 桌面工作区分屏面板 | `addWorkspacePanel`，和 agent 左右并排 | 未开始 |
| P7 打磨 | 缓存淘汰上限、错误态、限流文案 | 未开始 |
| 乔木侧生成中文版 | 原 P5 | 取消。乔木 9 篇样本 7 篇有改写，译文 9/9 返回 unavailable，乔木自己能给的够用 |
| Composer pill | agent 输入栏常驻按钮 | 被 0.16 卡住，见第 8 节 |
| 正文写进输入框（不直接发） | 用 `insertText` + `focus()` | 同上 |

---

## 5. 文件地图

客户端（跑在 App 里）：

| 文件 | 行数 | 作用 |
| --- | --- | --- |
| `client/screen.tsx` | 262 | 频道 chips、状态行、列表；有选中文章时切到正文视图 |
| `client/article.tsx` | 368 | 正文视图：返回、标题、版本 chips、Markdown、底部「陪读 / 原文」、陪读确认弹窗 |
| `client/subs-panel.tsx` | 250 | 订阅管理弹窗：列表、加源、删源、导入导出 OPML |
| `client/companion.ts` | 43 | 陪读提示词拼装 |
| `client/item.tsx` | 13 | 侧边栏行，图标 `Lamp` |

服务端（跑在 daemon 子进程里）：

| 文件 | 作用 |
| --- | --- |
| `server/feed.ts` | 列表分发：mine / qiaomu / aihot |
| `server/mine.ts` | 个人订阅抓取与合并 |
| `server/subs.ts` | 订阅文件读写、OPML 导入导出 |
| `server/feeds/parse.ts` | RSS / Atom / RDF 解析、OPML 解析与生成 |
| `server/qiaomu-article.ts` | 乔木正文与版本 |
| `server/page-article.ts` | 订阅条目正文抽取 |
| `server/text/markdown.ts` | HTML→Markdown、Readability 兜底 |
| `server/text/lang.ts` | 判定正文是否以英文为主（CJK 占比 < 5%） |
| `server/translate.ts` | 译文：分段调 DeepSeek，后台任务 + 进度，写缓存 |
| `server/translate-store.ts` | `translations/` 路径、短哈希文件名、译文读写 |
| `server/sources/aihot.ts` | AIHOT 两个接口 |
| `server/sources/qiaomu.ts` | 乔木列表与源名映射 |
| `server/sources/http.ts` | 15 秒超时、ETag、429 处理、JSON 与文本两种 |
| `server/cache.ts` | 内存 + 磁盘缓存 |

共享契约（Zod）：

| 文件 | 内容 |
| --- | --- |
| `shared/feed.ts` | 四个频道、条目 schema、四态取数、`lantern.list` |
| `shared/article.ts` | `lantern.article` |
| `shared/subs.ts` | 六个订阅 RPC |
| `shared/translate.ts` | `lantern.translate.request`、`lantern.translate.status` |
| `shared/ping.ts` | `lantern.ping` 自检 |

入口：

- `index.client.tsx`：注册屏幕 `lantern` + 侧边栏头部行。
- `index.server.ts`：注册 11 个 RPC。

---

## 6. 数据与缓存

目录：`%USERPROFILE%\.paseo\data\paseo-lantern\`

| 文件 | 内容 | 有效期 |
| --- | --- | --- |
| `subscriptions.json` | 个人订阅列表 | 永久 |
| `aihot-selected.json` | AIHOT 精选 | 10 分钟 |
| `aihot-hot.json` | AIHOT 热点 | 10 分钟 |
| `qiaomu.json` | 乔木精选 | 10 分钟 |
| `qiaomu-sources.json` | 乔木源 id → 名字 | 6 小时 |
| `qiaomu-entry-<id>.json` | 乔木单篇元数据 | 30 分钟 |
| `qiaomu-body-<id>.json` | 乔木正文 Markdown | 7 天 |
| `qiaomu-translation-<id>.json` | 乔木译文 | 30 分钟 |
| `mine-<subId>.json` | 单个订阅抓到的条目 | 15 分钟 |
| `page-<sha1>.json` | 订阅条目正文 | 7 天 |
| `translations/<key>.json` | 个人订阅的本地译文 | 永久 |

`key` / `<sha1>` 都是条目 id 或 url 的 sha1 前 16 位。

旧编号的 `rewrites/` 目录不再使用（EDC 改写已取消）。

取数四态（`shared/feed.ts`）：

- `live`：这次抓到新数据 → 「更新于 HH:mm」
- `revalidated`：304，内容没变 → 「已是最新 HH:mm」
- `cached`：有效期内没发请求 → 「缓存 HH:mm」
- `stale`：请求失败用旧缓存 → 「离线缓存 HH:mm」

---

## 7. 外部接口与限制

AIHOT（匿名只读）：

- `GET https://aihot.news/api/v1/items?mode=selected&window=24h&limit=`
- `GET https://aihot.news/api/v1/hot-topics`
- 没有单篇正文接口，官方禁止猜 `/api/v1/items/{id}`。
- 轮询最快 60 秒；单 IP 每分钟超约 60 次返 429。
- 使用规则：对外商业、公开镜像、批量再分发需书面授权。自用免费。

乔木（匿名只读）：

- `GET https://rss.qiaomu.ai/api/sources`
- `GET https://rss.qiaomu.ai/api/entries?limit=`
- `GET https://rss.qiaomu.ai/api/entry/:id`，返回 `entry.content`（HTML 正文）、`rewrite.body`（Markdown）
- `GET /api/entry/:id/translation`、`/rewrite`
- 译文不可用时返回 `{ translation: null, status: "unavailable" }`，要当「没有」处理，不是错误。

个人订阅：

- 自己抓 RSS/Atom/RDF，不经过乔木。
- 加源时抓一次取标题；地址必须 http(s)；重复地址直接返回已存在的。

---

## 8. 卡在哪里：Paseo 0.15.4 没有 composer 写入

- 当前桌面 app、daemon、npm 最新稳定版都是 **0.15.4**。
- 0.15.4 的 `@getpaseo/plugin` 客户端只导出 `usePaseo` / `useAgent` / `useWorkspace` / `useHosts` / `useRpc` / `useSettings` / 文件 hooks / `openExternalUrl`。
- 没有 `useComposers`，`PluginClientContext` 上也没有 `composers`。
- `SendMessageOptions` 没有 draft 模式，只有 `agent.send()` 直发。
- `useComposers` 在 `@getpaseo/plugin@0.16.0-beta.2` 里才有（包内有 `dist/client/composer.d.ts`）。

所以陪读做成了「弹窗预览 + 确认后直发」。等 0.16 正式版出来后：

1. 升级 `@getpaseo/plugin` 的 devDependency，`requirements.paseo` 改 `>=0.16.0`。
2. 把 `sendCompanion()` 改成 `insertText` + `focus`，弹窗保留。

注意：本机桌面弹的「有可用更新」是别的软件，待装包其实是同版本 0.15.4，跟你无关。

---

## 9. 踩过的坑

按先后顺序，都能复现。

1. **`paseo plugin init` 要求目录完全为空。** 目录里有 `docs/` 会报 `Plugin directory must be empty`。做法：先把 `docs` 挪到同级临时目录，init 完再挪回。
2. **`paseo` 不在 PATH。** bash 里直接写 `paseo` 报 command not found，必须 `D:\paseo\resources\bin\paseo.cmd`。
3. **`@types/node` 必须装，并在 `tsconfig.compilerOptions.types` 加 `"node"`。** 否则 `server/` 下所有 `node:fs` 报 TS2307。只加 node，不加 DOM，符合跨端规则。
4. **横向 `ScrollView` 做 chip 条会塌陷。** 切到第三个频道两次后整条高度变 0、消失。试过 `flexGrow:0` + 固定高度、`contentContainerStyle` 带 height，都不稳。最终改成 `View` + `flexDirection:row` + `flexWrap:wrap`，稳定。四个中文 chip 在 375 宽会换行。
5. **`PluginScreenProps` 没有 `openScreen`。** 只有 `params` / `navigation` / `theme` / `host` / `layout`。插件内多级页面只能一个 screen + 内部 state 切换，返回按钮自己画。`openScreen` 只在 sidebar item、popover、Command Center、pill 的回调里有。
6. **桌面 UI 自动化点长中文可访问名会失败。** `clickname.ps1 -Name "长中文标题"` 报 not found（参数编码随控制台 codepage 变）。短名可用。长名改用 `tap.ps1 -X -Y` 点坐标；更稳的做法是把名字写进 UTF-8 文件，脚本用 `Get-Content -Encoding UTF8` 读（`C:\tmp\clickfile.ps1`）。
7. **PowerShell 读中文文件默认按 ANSI。** `Get-Clipboard` / `Get-Content` 会把 UTF-8 中文变成「灏戞暟娲?」这类乱码，导入 OPML 时订阅标题就乱了。验证中文要用 `[IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)`。这是测试工具的问题，不是插件的问题。
8. **重载插件会关掉已打开的「提灯」标签页。** 每次 reload 后要重新点侧边栏进页面。否则后续点击会打到 Idealoft 的界面上。
9. **`Markdown` 组件里的图片点了会开宿主图片预览**，全屏挡住界面，按 Esc 关闭。不是 bug。
10. **`useToast` 的提示容易被别的系统提示遮住**，截图看不到不等于没触发。验证结果要看数据文件，不要看提示。

---

## 10. 已知问题

1. 正文缓存没有容量上限和淘汰（SPEC 写的是 100 篇 / 30 天）。目前只按时间过期，不限数量。
2. 订阅条目的正文页有「原文 / 译文」两个 chip（只对英文正文出现）。
3. 订阅抓取是懒加载：打开频道或点刷新时才抓。不会后台定时跑。
4. 乔木译文接口对多数样本返回 `unavailable`，译文 chip 常是灰的。
5. 陪读只能发给「最近更新过的 agent」，没有手动选目标的功能。

## 11. 没验证过的

- 「译文」的界面部分：chip 什么时候出现、进度文案、翻完后自动切版本、失败重试。服务端已实测（见 11.7），客户端未实测。
- iPhone 上的实际体验：列表、正文长文滚动、订阅弹窗（底部弹层）、陪读弹窗、译文 chip。
- 真断网时的 `stale` 分支（从没断网测过）。
- Readability 兜底分支（现有样本乔木都自带 `content`，没走到）。
- 订阅很多（20+）时的抓取耗时。

## 11.5 陪读投递已验证（2026-11-12 18:20）

用户在桌面点「发送」，目标 agent 收到完整提示词并按模板回答了那篇文章。

结论：`paseo.agents.ref(id).send()` 链路通，提示词拼装正确，四个频道的数据都能进提示词。

---

## 11.6 为什么不做 EDC 改写（2026-11-12 深夜）

先用两件事排除乔木侧：

- 乔木 9 篇样本里 7 篇有 `rewrite.body`，2800–7200 字。
- 9 篇的 `translation` 全部 `unavailable`。

所以乔木侧不做生成。英文文的缺口在「我的订阅」。

第一版做的是「EDC 改写」：把正文写成源文件，交给 agent，agent 写出中文稿。做完了，也跑通了。

但它有个绕不过的体验问题：Paseo 0.15.4 的 `agent.send()` 只能直发，用户要去会话界面看 agent 在干什么。这让阅读被打断。

改成的做法：服务端自己调翻译接口，点一下就在原地出译文，不跳页、不开弹窗、不碰 agent。

## 11.7 译文服务端实测（2026-11-12 23:50）

用 SoftBank 那篇（4 段、5030 字符）实测：

- `lantern.translate.request` 立即返回 `working`，后台开跑。
- 4 段约 9 秒翻完，状态转 `ready`。
- 正文页 `version: "translation"` 读到 2482 字中文稿，`versions.translation` 为 `true`。
- 接口：`https://api.deepseek.com/chat/completions`，模型 `deepseek-chat`，key 读 `~/.pi/agent/auth.json` 的 `deepseek.key`（也认 `DEEPSEEK_API_KEY`）。

坑：把「第 x/y 段」写进 user 消息，模型会把它当正文一起输出。现已改成只发片段，另加一层前缀清理。

## 12. 下次开工建议

先实测「译文」的界面（第 14 节第 12–15 条）。

实测通过后做 P6 已读 / 收藏：

1. `shared/state.ts`：`lantern.state.get` / `lantern.state.set`。
2. 存 host settings，`scope: "host"`，键名 `read`、`star`。
3. 列表行加左边未读小点，正文页底部加收藏。

再往后：正文缓存加容量上限与淘汰（现在只按时间过期）。

---

## 13. 提交记录

```
9086a55 fix: stop page cache key collisions and decode html entities in feed titles
5738bef feat: EDC rewrite for english articles in personal subscriptions
cd9592e docs: mark companion delivery as verified
9d3a9cc docs: record P4 status and the composer API limitation
4940cba feat: P4 companion send with confirmation dialog
622fde1 docs: record P3 status and verification
dafa4e7 feat: P3 personal subscriptions with OPML import and export
99f3a59 feat: P2 article view with extraction and version switching
091b4a3 feat: P1 feeds from AIHOT and Qiaomu with disk cache
971aec2 feat: move the lantern row into the sidebar header group
3fa23ab feat: P0 skeleton with sidebar entry and ping rpc
```

仓库只在本机，没配远端。

---

## 14. 验收清单（手机上逐条点）

1. 侧边栏能看到「提灯」，在 Idealoft 下面。
2. 点进去，AIHOT 精选有条目。
3. 切到乔木精选，标题是中文。
4. 点开一篇，正文能读，图片能显示。
5. 点「乔木改写」，有则显示中文稿。
6. 切到「我的订阅」，能看到少数派、阮一峰和 TechCrunch AI 的条目。
7. 点「订阅管理」，弹窗在手机上从底部升起。
8. 回列表点「刷新」，状态行时间变化。
9. 打开一篇文章点「陪读」，弹窗显示 agent 名和提示词。
10. 点「发送」，那个 agent 收到消息。（已验证 2026-11-12 18:20）
11. 深色模式下文字颜色正常。
12. 打开一篇 TechCrunch 英文文章，顶部有「原文 / 译文」两个 chip。（未验证）
13. 点「译文」，chip 变成「翻译 x/4」，不用跳任何页面。（未验证）
14. 翻完后自动切到中文稿，chip 显示「译文」。（未验证）
15. 关掉页面再打开同篇，直接点「译文」就能看，不再重新翻。（未验证）
