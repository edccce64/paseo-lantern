# HANDOFF · paseo-lantern（提灯）

最后更新：2026-11-14 17:30
当前版本：B 版「日报」视觉落地（报纸式列表、正文与订阅弹窗）+ 来源名清洗 + 正文样板行清洗。
待验证：手机端、深色模式、表格渲染。

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
| AIHOT 正文：从原文页抽取（两个频道都是） | 已完成 |
| 乔木版本切换：原文 / 译文 / 乔木改写 | 已完成 |
| 个人订阅：加源、删源、导入导出 OPML | 已完成 |
| 推荐源搜索：内置 1342 个独立博客目录，搜名字或标签一键订阅 | 已完成（已验证 2026-11-14） |
| 陪读：弹窗确认后发给最近活跃 agent | 已完成（已实测发送） |
| 译文：AIHOT 与「我的订阅」的英文正文点一下，服务端直连 DeepSeek 翻成中文 | 已完成（界面已验证 2026-11-13） |
| 已读：列表未读圆点，打开即标已读 | 已完成（已验证 2026-11-13） |
| 收藏：正文页底部按钮 + 顶部「收藏」频道 | 已完成（已验证 2026-11-13，落盘 2026-11-14） |
| 桌面工作区分屏面板：和 agent 并排看同一份界面 | 已完成（已验证） |
| 桌面宽屏两栏：左列列表 320，右侧读正文，选文章不替换整页 | 已完成（已验证 2026-11-14） |
| 后台定时刷新个人订阅：每 15 分钟一轮 | 已完成（已验证 2026-11-14） |
| 缓存总量上限 100 MB，超出按最旧淘汰 | 已完成（已验证 2026-11-14） |

## 4. 还没做

| 项 | 原计划 | 说明 |
| --- | --- | --- |
| Composer pill | agent 输入栏常驻按钮 | 被 0.16 卡住，见第 8 节 |
| 正文写进输入框（不直接发） | 用 `insertText` + `focus()` | 同上 |
| `@` 附件源 | `addAttachmentSource` 注册 AIHOT 与乔木两个源 | 未做 |
| 侧边栏未读数 | 行上显示未读条数 | 未做 |
| 按源配置刷新间隔 | SPEC 5.3 写的 15–30 分钟 | 现在统一 15 分钟 |

---

## 5. 文件地图

客户端（跑在 App 里）：

| 文件 | 行数 | 作用 |
| --- | --- | --- |
| `client/screen.tsx` | 377 | 频道 chips + 图标操作、列表、底部状态；桌面左列 |
| `client/article.tsx` | 528 | 正文视图：返回、标题、版本 chips、Markdown、底部「AI 陪读 + 收藏 + 原文」、AI 陪读确认弹窗 |
| `client/subs-panel.tsx` | 250 | 订阅管理弹窗：列表、加源、删源、导入导出 OPML |
| `client/companion.ts` | 19 | AI 陪读提示词拼装（标题、来源、链接，不含正文） |
| `client/panel.tsx` | 10 | 工作区分屏面板，渲染同一个 `LanternSurface` |
| `client/item.tsx` | 13 | 侧边栏行，图标 `Lamp` |

服务端（跑在 daemon 子进程里）：

| 文件 | 作用 |
| --- | --- |
| `server/feed.ts` | 列表分发：mine / qiaomu / aihot |
| `server/mine.ts` | 个人订阅抓取与合并 |
| `server/background.ts` | 后台定时刷新订阅：启动 60 秒后第一轮，之后每 15 分钟 |
| `server/subs.ts` | 订阅文件读写、OPML 导入导出 |
| `server/catalog.ts` | 内置博客目录搜索（名字、RSS 地址、标签） |
| `server/data/blog-catalog.ts` | 1342 个独立博客的名字与 RSS 地址，生成自 chinese-independent-blogs（MIT） |
| `server/feeds/parse.ts` | RSS / Atom / RDF 解析、OPML 解析与生成 |
| `server/qiaomu-article.ts` | 乔木正文与版本 |
| `server/page-article.ts` | 订阅条目正文抽取 |
| `server/text/markdown.ts` | HTML→Markdown、Readability 兜底 |
| `server/text/lang.ts` | 判定正文是否以英文为主（CJK 占比 < 5%） |
| `server/errors.ts` | 限流/超时/断网/对方报错的统一文案 |
| `server/translate.ts` | 译文：分段调 DeepSeek，后台任务 + 进度，写缓存 |
| `server/translate-store.ts` | `translations/` 路径、短哈希文件名、译文读写 |
| `server/sources/aihot.ts` | AIHOT 两个接口 |
| `server/sources/qiaomu.ts` | 乔木列表与源名映射 |
| `server/sources/http.ts` | 15 秒超时、ETag、429 处理、JSON 与文本两种 |
| `server/cache.ts` | 内存 + 磁盘缓存，正文按篇数/天数淘汰，目录按 100 MB 淘汰 |

共享契约（Zod）：

| 文件 | 内容 |
| --- | --- |
| `shared/feed.ts` | 四个频道、条目 schema、四态取数、`lantern.list` |
| `shared/article.ts` | `lantern.article` |
| `shared/subs.ts` | 六个订阅 RPC |
| `shared/translate.ts` | `lantern.translate.request`、`lantern.translate.status` |
| `shared/settings.ts` | host settings：`read`、`star`（`defineSettings`） |
| `shared/ping.ts` | `lantern.ping` 自检 |

入口：

- `index.client.tsx`：注册屏幕 `lantern`、工作区分屏面板 `lantern`（图标 `Lamp`）、侧边栏头部行。
- `index.server.ts`：注册 11 个 RPC，并 `registerSettings(lanternStateSettings)`。

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
| `translations/<key>.json` | AIHOT 与个人订阅的本地译文 | 永久 |

`key` / `<sha1>` 都是条目 id 或 url 的 sha1 前 16 位。

淘汰规则（`server/cache.ts`）：

- `page-*.json`：最多 100 篇，最长 30 天。
- 整个缓存目录：最多 100 MB，超出按 mtime 从最旧删起。
- `subscriptions.json` 永不删除。
- 两个规则共用一小时一次的扫描周期，写完正文缓存后触发。

旧编号的 `rewrites/` 目录不再使用（EDC 改写已取消）。

已读与收藏不进这个目录：存在 host settings 里，文档 id `lantern-state`，`scope: "host"`，`version: 1`。

- `read`：`${source}:${id}` 字符串数组，只留最后 500 条（`MAX_READ_ENTRIES`）。
- `star`：整条 `FeedItem` 快照数组。「收藏」频道不联网也能渲染。
- 读写走客户端 `useSettings()`；服务端只 `registerSettings` 声明 schema。保存用 revision 做乐观锁，冲突时重拉一次。

取数四态（`shared/feed.ts`）。显示位置：列表底部 footer（空列表不显示）：

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
- 热点接口（`hot-topics`）不返回 `summary`。所以两个频道的正文都靠 daemon 从 `links.original` 抓原文页再抽。实测 10 篇热点全部抽取成功（567–26663 字）。
- 抽不到时退回 `summary`；热点没有 `summary`，此时只能看「抓不到正文」的提示。
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

1. 订阅抓取间隔统一 15 分钟，不按源配置（SPEC 5.3 写的是 15–30 分钟按源配置）。
2. 订阅条目的正文页有「原文 / 译文」两个 chip（只对英文正文出现）。
3. 后台刷新只在 daemon 运行时跑。daemon 停了，只能在打开频道时懒加载。
4. 乔木译文接口对多数样本返回 `unavailable`，译文 chip 常是灰的。
5. 陪读只能发给「最近更新过的 agent」，没有手动选目标的功能。
6. 手机上没有两栏：宽屏判断用 `layout.compact`，手机上始终单列推入。

## 11. 没验证过的

- 译文的失败重试与多段长文进度：正常路径已验证（2026-11-13 用户实点），失败态没造过。
- 已读与收藏的跨设备同步：host settings 应跟着 host 走，但没有第二台设备验证。
- 整个桌面 App 彻底重启后收藏是否还在：只验证到插件重载（2026-11-14），这时 daemon 子进程已重启、settings 从磁盘重读。
- iPhone 上的实际体验：列表、正文长文滚动、订阅弹窗（底部弹层）、AI 陪读弹窗、译文 chip。
- 搜索框的中文输入法：改掉 `autoCapitalize` / `autoCorrect` 并加 350ms 防抖后，用输入法逐字打字是否不再转英文。粘贴中文已验证可用。若仍失败，备选是「回车才搜索」或把搜索框移出弹窗（见 11.17）。
- 真断网时的 `stale` 分支（从没断网测过）。
- Readability 兜底分支（现有样本乔木都自带 `content`，没走到）。
- 订阅很多（20+）时的抓取耗时。
- 后台刷新连续跑很久后的内存与磁盘增长（只跑过一轮）。

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

## 11.8 AIHOT 也可以点译文（2026-11-13 01:50）

AIHOT 两个频道的英文条目也加了译文 chip，和「我的订阅」同一套逻辑。实测「黄仁勋辞任」那篇（3074 字符、2 段）：6 秒出 1245 字中文稿，`versions.translation` 为 `true`。

乔木继续用乔木自己的译文，不进这套。

## 11.9 已读与收藏（2026-11-13 02:00）

存 host settings，文档 id `lantern-state`，不用插件自己的磁盘目录。

- 列表行左邊未读小圆点；点开就写进 `read`，圆点消失。
- 正文页底部 `陪读 ｜ 收藏 ｜ 原文`；已收藏时按钮文字变「已收藏」，描边变强调色。
- 顶部多了「收藏」频道。它是客户端伪频道，不调 `lantern.list`，直接用 `star` 里的 `FeedItem` 快照渲染。
- `read` 只留最后 500 条；`star` 存整条快照，所以收藏的条目即使从原频道消失也还在。
- 写入用 revision 乐观锁；返回 false（冲突）就 `reload()` 一次。

## 11.10 桌面分屏面板（2026-11-13 02:20）

`client.addWorkspacePanel({ id: "lantern", title: "提灯", icon: "Lamp", Component: LanternPanel })`。

- 面板与全屏页共用 `LanternSurface`，只是外层容器不同。
- `index.client.tsx` 用 `LanternScreen` 薄包装把 `PluginScreenProps` 适配成 `LanternSurface` 需要的 `theme` / `layout`。
- 已核对桌面 app 的 bundle 里存在 `addWorkspacePanel`（`app-dist/_expo/static/js/web/index-*.js`）。
- 入口（已验证 2026-11-13 03:24）：工作区标签栏的「+」菜单 → 列表里就有「提灯」。不需要 Command Center。
- 另注册了一个 Command Center 项「打开提灯面板」，保留作备选。
- 面板不会自动出现，要从「+」菜单开一次。开出来是标签页，可以拖动排到 agent 旁边。

## 11.11 打磨（2026-11-13 02:40）

四项：

1. **正文缓存淘汰**：`server/cache.ts` 的 `prunePageCache()`。只动 `page-*.json`，上限 100 篇、最长 30 天，一小时最多扫一次（写完正文缓存后触发）。
2. **错误文案统一**：`server/errors.ts`。限流说「对方限流了，约 N 秒后再试」；超时说「超时了，网络慢或对方没响应」；断网说「连不上 X，检查网络」；对方报错按状态码分 401/403、404、4xx、5xx。
3. **抓取并发**：`server/mine.ts` 的 `CONCURRENCY` 从 3 提到 5。
4. **界面提示**：收藏/取消收藏有 toast；列表处于 `stale` 时多一行「有源抓取失败，现在显示的是上次缓存」。

验证：淘汰逻辑用造数据实测（110 篇 → 留 100，删最旧 10；非 `page-` 文件不动；超 30 天的假数据全删）。错误文案逐条实测输出。离线提示在界面上实测过（2026-11-13 03:27，截图确认状态行变「离线缓存 03:27」并出现提示行）。

## 11.12 P8：两栏、后台刷新、缓存上限（2026-11-14）

三项：

1. **桌面两栏**（`client/screen.tsx`）：`layout.compact` 为假时，外层 `flexDirection: "row"`，左列固定 320，右侧渲染正文或「从左边选一篇文章」。手机仍单列推入。列表内边距统一 16。
2. **后台定时抓取**（`server/background.ts`）：插件启动 60 秒后跑第一轮，之后每 15 分钟一轮。没有订阅源时跳过。有防重入标记（上一轮没跑完不开下一轮）。`index.server.ts` 返回停止函数，插件卸载时清定时器。
3. **缓存总量上限**（`server/cache.ts`）：`pruneSize()` 递归统计目录内 `.json` 总大小，超 100 MB 时按 mtime 从最旧删，直到低于上限。`subscriptions.json` 与 `.tmp` 在同目录但受保护。

验证：

- 缓存：造数据实测 126 MB / 110 篇 → 84 MB / 100 篇；最旧 page 被删、最新保留；`subscriptions.json` 与 `mine-*.json` 保留；3 个 42 MB 大文件按最旧优先删 1 个。
- 后台刷新：插件日志出现 `background sync scheduled every 15 minutes`，启动 60 秒后出现 `background sync: 3 sources, 33 items, live`。
- 两栏：截图确认。选中文章后左列仍在，右侧显示正文。
- 收藏落盘：点收藏后 `~/.paseo/plugin-settings/paseo-lantern/lantern-state.json` 的 `star` 出现完整快照；插件重载后「收藏」频道仍有 1 条。

## 11.13 界面去文案（2026-11-14）

原则：不必要的辅助标签与说明删掉，用位置、图标、分组表达功能。

列表页（`client/screen.tsx`）：

- 删掉常驻状态行（原来一行写「缓存 01:24」+「订阅管理」+「刷新」）。
- 「订阅管理」与「刷新」改为图标按钮（`Settings` / `RotateCw`），放在 chip 行右侧。刷新中图标变强调色。
- 数据新鲜度移到列表底部 footer，只有滚动到底才看到。空列表不显示。
- 频道名缩短：`精选 / 热点 / 乔木 / 订阅 / 收藏`。无障碍标签保持全名。
- 列表行去掉「精选」类徒标，只留来源 + 时间；来源过长时只截断来源，时间始终可见。
- 空态文案缩短（「还没有收藏」「还没有订阅」「暂无内容」），配图标。
- 桌面右栏空态：`Lamp` 图标 + 「选一篇文章」。

文章页（`client/article.tsx`）：

- 顶部「返回」改 `ChevronLeft` 图标。
- 版本行只渲染可用版本，且只有多于一个版本时出现。乔木只有原文 + 改写两个时仍在。
- 底部「收藏 / 原文」改图标按钮（`Star` / `ArrowUpRight`）；已收藏的星星用强调色描边。
- 翻译进度文案缩短；无正文文案改「没有正文」。

订阅弹窗（`client/subs-panel.tsx`）：空态从两句改一句。

验证：截图确认列表页、文章页、收藏空态、订阅弹窗；`tsc --noEmit` 0 错误；客户端禁用 API 扫描 0 命中。移动端字号与触控尺寸未实测（chip 在手机上仍为 44 高）。

### 11.13.1 手机上报的三个问题（2026-11-14）

1. **订阅频道把「收藏」挤到第二行**。原因：齿轮按钮占了 chip 行宽度。修法：靴轮移出 chip 行，改成右下角浮动按钮（仅在「订阅」频道显示）。chip 行回到四个频道 + 刷新的一行布局。列表底部加 84 的 padding，避免被浮动按钮遮住。
2. **订阅弹窗布局散**。原因：内层 `ScrollView` 写了固定 `maxHeight`（260/320），内容少也占满，底部大空白；导入/导出按钮没设 flex，挤在左侧。修法：去掉内层 `ScrollView`，交给 Modal 自己滚动；导入/导出改 `flex: 1` 各占一半。
3. 手机端未实测，以上按代码推断与桌面截图验证。

## 11.14 翻译并发（2026-11-14）

问题：译文串行调用，一段接一段。长文慢。

实测（`deepseek-chat`，单段 1600 字符）：

| 文章 | 段数 | 串行 | 全并发 |
| --- | --- | --- | --- |
| SoftBank（5030 字符） | 4 | 8.8 秒 | 2.6 秒 |
| Latent Space（26663 字符） | 21 | 39.0 秒 | 2.5 秒 |

单段本身只要 1.3–2.9 秒。瓶颈是串行累加。

改法（`server/translate.ts`）：

- `CONCURRENCY = 6`，worker 池取段，`parts[index]` 按段号写回，顺序不乱。
- 任一段失败就设 `failed` 标志，不再开新段；已在跑的段跑完。
- 429 / 5xx 重试一次，等 1.5 秒。

端到端实测：TechCrunch 4483 字符 / 3 段，点译文后 2 秒内出中文稿并写入 `translations/`，段落顺序与原文一致。

未验证：真实 429 触发后的重试路径（实测 21 路并发未限流）。

## 11.15 桌面左列加宽（2026-11-14）

问题：桌面左列 320pt 时，五个频道标签放不下一行，「收藏」掉到第二行。手机 375pt 是一行。

算数：标签区 = 左列宽 - 32（内边距）- 8（间隙）- 36（刷新图标）。320 时只有 244pt，五个标签需要约 299pt。

改法：`styles.wideList.width` 从 320 改为 380。标签区 304pt，五个标签一行。窗口 1254pt 宽时，正文从 934pt 变为 874pt。

验证：截图确认桌面五个标签与刷新图标在一行，列表标题少换行；正文标题与段落排版正常。

## 11.16 AI 陪读弹窗（2026-11-14）

三项：

1. 按钮与弹窗标题：「陪读」改「AI 陪读」。按钮字 15 → 16，加粗。
2. 删掉弹窗里的「目标 agent」与 agent 名两行。agent 标题就是当前会话名，放在这里没有意义。发送目标仍取最近活跃 agent。
3. 提示词改短：不贴摘要、不贴正文，只给标题 / 来源 / 链接。固定文案：
   `帮我阅读这篇文章，先讲清楚背景和关键概念，再讲清楚对普通人的影响是什么。不确定的术语或专有名词查清楚告诉我。引用原文要标出处。抓取原文链接原文再回答。`

顺手修了两处：预览文字 12 → 13 并换用正文色（原来偏灰难读）；「发送」按钮加 `minWidth: 92`，否则字变大后竖排换行。

验证：截图确认按钮与弹窗标题、无 agent 行、提示词内容、发送按钮一行。`tsc` 0 错误。发送链路未重测（与以前同一函数，参数不再传正文）。

## 11.17 推荐源搜索（2026-11-14）

订阅弹窗加了搜索框，数据是内置目录，不联网。

- 目录：`server/data/blog-catalog.ts`，1342 条，字段 name / url(RSS) / site / tags。来源 `timqian/chinese-independent-blogs`（MIT），去掉了原 id 字段。
- 搜索：`server/catalog.ts` 的 `suggestSources(query, limit)`。排序：名字开头匹配 > 名字包含 > 标签或地址包含。空 query 返回前 10 条。
- RPC：`lantern.subs.suggest`，默认最多 10 条。
- 客户端：输入即时搜，每条显示名字与标签，右侧「订阅」按钮；已存在的地址显示「已订阅」。点订阅直接用目录里的名字作为标题，不再抓一次源取标题。
- `lantern.subs.add` 新增可选 `title` 参数。

验证：搜索「阮一峰」返回 1 条；点「订阅」后写入 `subscriptions.json`，列表出现该项，按钮变「已订阅」。纯函数测试：编程 → 5 条，少数派 / 晚点 → 0 条（这两个不在独立博客目录里，符合预期）。

中文输入（2026-11-14）：用户报告输入法一打就转英文。已做两处调整：搜索框去掉 `autoCapitalize` / `autoCorrect`，并加 350ms 防抖（输入组字时不再每敲一下就发请求）。已验证：粘贴中文「阮一峰」能正常搜索。未验证：直接用输入法逐字打字。

限制：目录里没有公众号。公众号只在乔木服务端目录（185 源 / 90 个号），没有单源 RSS 地址，无法加入「我的订阅」。

## 11.18 B 版「日报」视觉落地（2026-11-14 17:30）

用户从三版模版里选了 B 版（参考 THE GAZETTE：纸色底、墨色衷线大标题、橙色点缀、报头、栏目横排、首字下沉）。模版原稿在 `~/.paseo/daily/mock/b-gazette.html`。

设计令牌：`client/style.ts`。

- `palette(theme)` 返回 paper / panel / ink / inkSoft / muted / rule / accent。深色模式下自动反相（用 surface0 的亮度判定）。
- `FONT.serif / FONT.sans / FONT.mono` 按平台选字族。
- `LABEL` / `SECTION` 是两套等宽小字排版常量。

列表页（`client/screen.tsx`）：

- 报头三行：日期与条数、报名「提灯日报」、右侧刷新（旋转动画 + 「刷新中」）。底部 3px + 1px 双线。
- 五栏目等宽横排，选中项橙色文字 + 3px 橙色下划线，不选中不跳动。
- 头条 26px 衷线带摘要（限 2 行），其余 17px；byline 用发丝线连来源与时间；未读标题墨色 + 橙方块，已读变灰。
- 搜索框（搜标题或来源）、清空按钮、空结果提示。
- 桌面右栏空态改为「今日速览」：日期、频道名、条数、最新一条、刷新与订阅管理入口。
- 收藏频道：无刷新按钮、无四态状态文字，长按可取消收藏。

正文页（`client/article.tsx`）：

- 宿主 `Markdown` 组件只收字符串、无样式入口，改为自建解析 + 渲染（`parseBlocks` / `renderBlocks`）。支持标题、段落、引用、列表、代码块、分隔线、图片、管状表格、行内加粗/斜体/代码/链接。
- 首字下沉：用 `dropCapUsed` 标记，第一个真正的段落才下沉（图片/标题/列表开头不会占位）。
- 切文章与切版本时回顶部（`ScrollView` ref + `scrollTo`）。
- 版本切换改下划线式；底部「AI 陪读」改描边次级按钮，收藏与原文为图标按钮。

订阅弹窗（`client/subs-panel.tsx`）：双 tab（已订阅 / 发现）。发现 tab 空查询时直接出 8 条推荐源；搜索框、RSS 折叠入口、删除二次确认、OPML 导入导出。

共用：

- `server/text/source-name.ts`：`cleanSourceName()` 把「栏目 | 站点」分成 site + label；`displaySourceName()` 优先站点名；`backfillSourceNames()` 给旧缓存补 site。
- `server/cache.ts` 的 `readFeedCache()`：四个频道都走它，读旧缓存时补 site 并写回。
- `server/text/markdown.ts` 的 `cleanBoilerplate()`：去掉 `In Brief`、`Posted:`、`6 min read`、目录锚点行、`AM/PM` 时间行、重复的来源名。

### 11.18.1 验证

- 已验证：`npx tsc --noEmit` 退出码 0（全程跑了 8 次）。
- 已验证：桌面截图确认列表页报头/栏目/头条/byline/未读区分/右栏速览/搜索框/footer；正文页首字下沉、图片、版本下划线、描边陪读按钮；订阅弹窗双 tab、推荐源列表、删除确认视觉、订阅标题变短。
- 已验证：清洗函数 5 组输入；样板行清洗在真实缓存正文上跑过（Cursor 那篇）。
- 已验证：表格 block 识别（6 组样例，含非表格竖线行不被误判）。
- 未验证：手机端（报头折行、弹窗、表格横向滚动）、深色模式、真断网、译文与陪读弹窗新样式。

### 11.18.2 踩到的坑

- turndown 7.2.5 默认不输出管状表格，必须先在 `server/text/markdown.ts` 加 table 规则。
- 正文抓取会带出「图片套链接」写法 `[\n\n![](图)\n\n](链接)`，不处理会在页面上露出孤立的 `[` 和 `](url)` 碎片。
- 来源名必须在**读缓存时**清洗，否则旧缓存里的条目还是长名。
- `subscriptions.json` 里的 title 也是 `addsub` 时抓到的长标题，在 `readSubs()` 里就地洗短。

## 12. 下次开工建议
剩下的都是小项，按需挑：

1. `@` 附件源：`addAttachmentSource` 注册 AIHOT 与乔木，选文章返回固定文本快照。
2. 侧边栏行未读数：`SidebarRow` 支持 badge 时加上。
3. 按源配置刷新间隔（SPEC 5.3）。
4. 等 Paseo 0.16 正式版，把陪读从「直发」改成「写进输入框」。

---

## 13. 提交记录

```
a264fda fix: let the catalog search accept chinese input
2001474 feat: search a built-in blog catalog when adding subscriptions
10d3c12 feat: reword the ai companion prompt and drop the agent label
599f3f3 fix: widen the desktop list column so the channels fit one row
744822a perf: translate chunks in parallel
9ccf7ea fix: keep the channel row on one line and tidy the subscription sheet
c3eb8ee refactor: drop secondary labels and let the layout carry the ui
2cea29d docs: record p8 status for the split view, background sync, and cache cap
587e4a5 feat: cap the cache directory at 100 MB
ed9b1a4 feat: refresh personal subscriptions in the background every 15 minutes
7e246d6 feat: show the list and article side by side on wide screens
fdd1d07 feat: offer translation chips for AIHOT articles
c17583d fix: fetch article bodies for AIHOT items from the original page
2a174c8 feat: translate english subscription articles in place
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
9. 打开一篇文章点「AI 陪读」，弹窗只显示提示词，不显示 agent 名。
10. 点「发送」，那个 agent 收到消息。（已验证 2026-11-12 18:20）
11. 深色模式下文字颜色正常。
12. 打开一篇 TechCrunch 英文文章，顶部有「原文 / 译文」两个 chip。（已验证 2026-11-13）
13. 点「译文」，chip 变成「翻译 x/4」，不用跳任何页面。（已验证 2026-11-13）
14. 翻完后自动切到中文稿，chip 显示「译文」。（已验证 2026-11-13）
15. 关掉页面再打开同篇，直接点「译文」就能看，不再重新翻。（已验证 2026-11-13）
16. 未读条目左侧有小圆点，点开后返回列表，圆点消失。（已验证 2026-11-13）
17. 打开一篇文章点「收藏」，按钮变「已收藏」。（已验证 2026-11-13）
18. 回列表切到「收藏」频道，刚收藏那篇在最上面。（已验证 2026-11-13）
19. 重开 App，「收藏」频道内容还在。（已验证 2026-11-14：插件重载后仍在；整个 App 重启未验证）
20. 桌面工作区里能同时开「提灯」面板和 agent，左右并排，列表与正文都能用。（已验证 2026-11-13 03:24，从「+」菜单开出来）
21. 桌面全屏页宽屏时是两栏，点开文章后左列列表还在，右侧显示正文。（已验证 2026-11-14，截图）
22. 个人订阅不用手动刷新，15 分钟内会自动更新。（已验证 2026-11-14：日志一轮 3 源 33 条）
23. 订阅弹窗里搜「阮一峰」，点「订阅」能加上，按钮变「已订阅」。（已验证 2026-11-14）
24. 用输入法在搜索框打中文，候选字不被踢成英文。（未验证，需用户实机试）
