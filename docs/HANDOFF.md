# HANDOFF · paseo-lantern（提灯）

最后更新：2026-11-20
当前版本：宿主 Paseo 0.16.1，插件要求写 `>=0.16.0`；陪读改为在 the-lantern 项目里开新对话并写入输入框（弹窗打开就预建，点完约 1.5 秒）；收藏独立成频道（乔木与订阅之间），页内两张卡片分「文章 / 仓库」，仓库读公开 star 并渲染 README；「今日速览」保留刷新按钮；桌面换鸿蒙字体 + 右栏「今日速览」居中 B 版 + 订阅管理开在右栏；白底主题 + X 链接正文走 FxTwitter；手机端列表常驻，文章盖在上面，读完返回列表保留原滚动位置（2026-11-20）。
待验证：深色模式仍未验证。手机端的检查（滑动手感、陪读写入与建新对话、GitHub 收藏分类与刷新、五个频道标签、字体与右栏与订阅管理、键盘避让、返回列表保留位置）均已由用户在真机确认（2026-11-18 ~ 2026-11-20）。

---

## 1. 这是什么

一个 Paseo 插件，名字叫「提灯」。

在 Paseo 里读新闻：AIHOT 精选、AIHOT 热点、乔木精选、我的订阅。读到不懂的地方，点「陪读」把文章交给 agent 解释。

- 规格书：`docs/SPEC.md`
- 项目目录：本仓库目录
- 插件 id：`paseo-lantern`
- 侧边栏位置：头部组，Idealoft 下方

---

## 2. 每次开工先跑这两条

```bash
cd <本仓库目录>
npx tsc --noEmit
paseo plugin reload paseo-lantern
```

Windows 上如果 `paseo` 不在 PATH，用安装目录里的 `paseo.cmd` 全路径。

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
| 第五个频道 XFeed AI | 已删除（2026-11-16，阅读体验不好） |
| 列表点开正文，Markdown 渲染 | 已完成 |
| AIHOT 正文：从原文页抽取（两个频道都是） | 已完成 |
| 乔木版本切换：原文 / 译文 / 乔木改写 | 已完成 |
| 个人订阅：加源、删源、导入导出 OPML | 已完成 |
| 推荐源搜索：内置 1342 个独立博客目录，搜名字或标签一键订阅 | 已完成（已验证 2026-11-14） |
| 陪读：在 the lantern 里开新对话，把提示词写进输入框，不自动发 | 已完成（桌面已验证 2026-11-18，手机已验证 2026-11-20） |
| 译文：AIHOT 与「我的订阅」的英文正文点一下，服务端直连 DeepSeek 翻成中文 | 已完成（界面已验证 2026-11-13） |
| 已读：列表未读圆点，打开即标已读 | 已完成（已验证 2026-11-13） |
| 收藏：正文页底部按钮 + 从「我的订阅」进收藏页 | 已完成（已验证 2026-11-13，落盘 2026-11-14） |
| 收藏频道：两张卡片分文章 / 仓库（仓库读公开 star + README） | 已完成（桌面已验证 2026-11-18，手机已验证 2026-11-20） |
| 刷新按钮：收藏页 GitHub 分类 + 「今日速览」 | 已完成（桌面已验证 2026-11-18） |
| 桌面工作区分屏面板：和 agent 并排看同一份界面 | 已完成（已验证） |
| 桌面宽屏两栏：左列列表 380，右侧读正文，选文章不替换整页 | 已完成（已验证 2026-11-14） |
| 桌面字体：鸿蒙 HarmonyOS Sans SC（标题 / 正文 / 标签统一） | 已完成（已验证 2026-11-18，真机界面） |
| 桌面右栏「今日速览」居中 B 版：水平居中 + 垂直居中 + 橙线 + 细线 | 已完成（已验证 2026-11-18，真机界面） |
| 后台定时刷新个人订阅：每 15 分钟一轮 | 已完成（已验证 2026-11-14） |
| 缓存总量上限 100 MB，超出按最旧淘汰 | 已完成（已验证 2026-11-14） |
| 报头手写字标 `The Lantern`（内嵌图，随主题变色） | 已完成（桌面已验证 2026-11-14） |
| 列表搜索：按标题或来源过滤当前频道 | 已完成（桌面已验证） |
| 来源名清洗：`AI News … | TechCrunch` 只显示 `TechCrunch` | 已完成（已验证） |
| 主题化弹层：订阅管理 / AI 陪读 / 取消收藏 全部纸色 | 已完成（桌面已验证 2026-11-14） |
| 订阅管理常驻右下角橙色齿轮 | 已完成（桌面已验证 2026-11-14） |
| 正文页：居中标题、署名紧跟其下、时间英文格式 | 已完成（桌面已验证 2026-11-14） |
| 手机正文页左滑返回列表（右滑不接管，留给宿主拉侧边栏） | 已完成（桌面鼠标拖拽已验证 2026-11-15，手机真机已验证 2026-11-20） |

## 4. 还没做

无。

2026-11-20 用户决定不做以下四项，已从清单删除：`Composer pill`、`@` 附件源、侧边栏未读数、按源配置刷新间隔。以后不要主动提这些。

---

## 5. 文件地图

客户端（跑在 App 里）：

| 文件 | 行数 | 作用 |
| --- | --- | --- |
| `client/screen.tsx` | 727 | 报头字标、频道横排、搜索、报纸式列表、桌面右栅「今日速览」、订阅管理浮动按钮、收藏确认 |
| `client/article.tsx` | 1101 | 正文视图：自建 Markdown 解析与渲染、居中标题与署名、版本切换、译文进度、AI 陪读、收藏 |
| `client/subs-panel.tsx` | 548 | 订阅管理弹层：已订阅 / 发现两个 tab、RSS 添加、推荐源搜索、OPML 导入导出 |
| `client/swipe.ts` | 70 | 横向滑动判定 `useHorizontalSwipe`：位移判定、防误触 `justSwiped` |
| `client/sheet.tsx` | 179 | 主题化弹层 `LanternSheet`，替掉宿主 `Modal`（宿主标题栏改不了颜色） |
| `client/style.ts` | 96 | 设计令牌：`palette(theme)`、`FONT`、`LABEL`、`SECTION`、`isDark` |
| `client/wordmark.ts` | 15 | 手写体字标 `The Lantern` 的内嵌 PNG（base64，墨色 / 奶油色两套） |
| `client/companion.ts` | 19 | AI 陪读提示词拼装（标题、来源、链接，不含正文） |
| `client/panel.tsx` | 7 | 工作区分屏面板，渲染同一个 `LanternSurface` |
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
| `server/text/markdown.ts` | HTML→Markdown（含管状表格规则）、Readability 兜底、`cleanBoilerplate()` 去样板行 |
| `server/text/source-name.ts` | `cleanSourceName()` 拆站点名与栏目名、`displaySourceName()`、`backfillSourceNames()` 补旧缓存 |
| `server/text/lang.ts` | 判定正文是否以英文为主（CJK 占比 < 5%） |
| `server/errors.ts` | 限流/超时/断网/对方报错的统一文案 |
| `server/translate.ts` | 译文：分段调 DeepSeek，后台任务 + 进度，写缓存 |
| `server/translate-store.ts` | `translations/` 路径、短哈希文件名、译文读写 |
| `server/sources/aihot.ts` | AIHOT 两个接口 |
| `server/sources/qiaomu.ts` | 乔木列表与源名映射 |
| `server/sources/http.ts` | 15 秒超时、ETag、429 处理、JSON 与文本两种 |
| `server/cache.ts` | 内存 + 磁盘缓存，正文按篇数/天数淘汰，目录按 100 MB 淘汰；`readFeedCache()` 读时补 `site` |

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
- `index.server.ts`：注册 12 个 RPC，并 `registerSettings(lanternStateSettings)`。

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

## 8. composer 写入：0.16.1 已可用（2026-11-18 落地）

- 旧限制（`0.15.4`）：客户端只导出 `usePaseo` / `useAgent` / `useWorkspace` / `useHosts` / `useRpc` / `useSettings` / 文件 hooks / `openExternalUrl`，没有 `useComposers`。
- `0.16.1` 新增 `useComposers`、`useComposer`、`useAgents`、`useWorkspaces`、`useNewWorkspace` 等。`PluginComposer` 提供 `insertText` / `focus` / `setPrompt` / `addAttachment`。
- 现状：`client/article.tsx` 用 `useComposers({ agentId })` 取目标 agent 的输入框，`insertText` 写入后用 `focus()` 把宿主切到那个标签页。弹窗保留，按钮写「写进输入框」。
- 细节：`composers` 不在 `usePaseo()` 返回的 `PluginPaseoApi` 上（类型会报 TS2339），只能用 hook；hook 不能写在回调里，所以在组件顶层用 `companion.agentId ?? ""` 调。
- 后续可做：Composer pill（`addComposerPill`）和 `@` 附件源（`addAttachmentSource`），两者在 0.16.1 都已存在。

注意：本机桌面弹的「有可用更新」是别的软件，跟你无关。

---

## 9. 踩过的坑

按先后顺序，都能复现。

1. **`paseo plugin init` 要求目录完全为空。** 目录里有 `docs/` 会报 `Plugin directory must be empty`。做法：先把 `docs` 挪到同级临时目录，init 完再挪回。
2. **`paseo` 不在 PATH。** bash 里直接写 `paseo` 报 command not found，必须 `D:\paseo\resources\bin\paseo.cmd`。
3. **`@types/node` 必须装，并在 `tsconfig.compilerOptions.types` 加 `"node"`。** 否则 `server/` 下所有 `node:fs` 报 TS2307。只加 node，不加 DOM，符合跨端规则。
4. **横向 `ScrollView` 做 chip 条会塌陷。** 切到第三个频道两次后整条高度变 0、消失。试过 `flexGrow:0` + 固定高度、`contentContainerStyle` 带 height，都不稳。最终改成 `View` + `flexDirection:row` + `flexWrap:wrap`，稳定。四个中文 chip 在 375 宽会换行。
5. **`PluginScreenProps` 没有 `openScreen`。** 只有 `params` / `navigation` / `theme` / `host` / `layout`。插件内多级页面只能一个 screen + 内部 state 切换，返回按钮自己画。`openScreen` 只在 sidebar item、popover、Command Center、pill 的回调里有。
6. **用桌面 UI 自动化点长中文可访问名会失败。** 直接传长中文名报 not found（参数编码随控制台 codepage 变）。短名可用。长名改用坐标点击；更稳的做法是把名字写进 UTF-8 文件再读。
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
5. 陪读固定开在名为 the-lantern 的项目目录下，换目标要改常量 COMPANION_PROJECT。新对话的模型照最近活跃的 agent 来，不能单独指定。
6. 手机上没有两栏：宽屏判断用 `layout.compact`，手机上始终单列推入。

## 11. 没验证过的

手机端的检查已由用户在真机确认通过（2026-11-18 ~ 2026-11-20）：陪读写入与建新对话、iPhone 整体体验（字标、标题、弹层、浮动按钮）、键盘避让、GitHub 收藏分类与 README 排版、两处刷新按钮、左滑返回与返回后保留列表位置。

剩下的项：

- 译文的失败重试与多段长文进度：正常路径已验证（2026-11-13 用户实点），失败态没造过。
- 已读与收藏的跨设备同步：host settings 应跟着 host 走，但没有第二台设备验证。
- 整个桌面 App 彻底重启后收藏是否还在：只验证到插件重载（2026-11-14），这时 daemon 子进程已重启、settings 从磁盘重读。
- 深色模式：字标已备奶油色版本，`palette()` 会按 `surface0` 亮度反相，但没实际切过。
- 表格渲染：解析与样式已写，未在真文章上看到表格。
- 桌面右栅「今日速览」两个按钮（刷新 / 订阅管理）未逐个实测。
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

用户从三版模版里选了 B 版（参考 THE GAZETTE：纸色底、墨色衷线大标题、橙色点缀、报头、栏目横排、首字下沉）。模版原稿没有进仓库。

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

## 11.19 报头改手写体字标（2026-11-14 18:00 ~ 18:30）

用户拿两张参考图（Adobe Handwriting Ernie、Belmonte Ballpoint）说要「潦草的手写字体、要大、有记忆点」。

### 做法：碎成图片内嵌，不是字体

RN 插件运行时加载不了字体文件（没有 expo-font），所以不能写 `fontFamily: "Caveat"`。改成：

1. Chrome headless 用 Caveat 700（Google Fonts，SIL OFL）渲染 `The Lantern`，`--default-background-color=00000000` 出透明底 PNG。
2. 用小脚本扫 alpha 通道裁掉透明边，同时按目标墨色重着色。
3. 输出两套：墨色 `#1B1917`、奶油色 `#EDE6D6`，尺寸 915×168，约 16 KB。
4. base64 内嵌进 `client/wordmark.ts`，界面用 `<Image source={{ uri }} style={{ width, aspectRatio }} />`。

好处：桌面和 iPhone 渲染一模一样，不受系统字体影响。代价：字标不可编辑，要改字得重新生成。

生成素材（样张页与中间图）没有进仓库，仓库里只有 `client/wordmark.ts` 里的内嵌 base64。

### 报头删到只剩字标

用户逐条砍掉了：日期与条数行、右上角刷新按钮（下拉已能刷新）、字标下方双线（3px + 1px）。

- `masthead`：`paddingTop: 38`、`paddingBottom: 34`。用户两次要求加大留白、「整个卡片再下来一点，字号不变」。
- 字标宽：手机 322、桌面 338。
- 刷新按钮删除后，旋转动画、`formatToday`、`refreshLabel` 一并清掉。

## 11.20 正文页排版（2026-11-14 18:40 ~ 19:10）

用户四轮反馈后的最终形态：

1. 标题下方一行署名：`Cursor Blog · NOV 13, 2026 · 20:00`。时间改英文格式（`formatWhen` 用 `MONTHS` 缩写）。
2. 标题与署名合成一块（`styles.head`，gap 8），上下各 22 留白。
3. 去掉首字下沉。用户原话「影响阅读体验，保持正文的整齐性」。
4. 去掉标题下面的 1px 分隔线。
5. 去掉正文区左上重复的「精选」徽标（右上已有频道名）。
6. 标题、署名、原文/译文切换全部居中。
7. 标题字号：手机 30 / 桌面 38（行高 39 / 49）。取消 `numberOfLines` 限制，否则大字号会把标题尾部切掉。

## 11.21 弹层主题化（2026-11-14 18:55）

问题：宿主 `Modal` 的标题栏是宿主自绘的，颜色跟 App 主题走（白），与纸色内容区割裂。`Modal` 的 API 只有 `title: string`，没有样式入口；试过 `title=""` 也只是把标题弄丢，白底依旧。

做法：新建 `client/sheet.tsx` 的 `LanternSheet`，完全自绘。

- 遮罩 `rgba(0,0,0,0.45)`，点遮罩关闭（`dismissible` 可关）。
- 手机：底部升起的 sheet，顶部 16 圆角 + 36×4 把手条，最大高度 88%。
- 桌面：居中对话框 520 宽、8 圆角、最大高度 80%。
- 自绘标题栏：`FONT.serif` 19 粗体 + 44×44 关闭按钮，无分割线。
- 内容区 `ScrollView`，左右 22、底 28、gap 14。
- `KeyboardAvoidingView`（iOS 用 `padding`），保证订阅弹层的输入框不被键盘遮。
- 入场：遮罩 160ms 淡入，sheet 200ms 上浮 + 淡入。

替换三处：订阅管理、AI 陪读、取消收藏。宿主 `Modal` 已从客户端完全移除。

## 11.22 订阅管理改回浮动按钮（2026-11-14 18:45）

之前因为浮动按钮压住列表内容，改成列表 footer 里的入口。用户在手机上实测后说「在列表最下方了，影响读者操作」，要求常驻右下角。

最终做法：

- `styles.fab`：右下角 18 / 22，56×56 圆角 28，背景 `palette.accent`（橙）。
- 只在「订阅」频道显示。
- 列表在「订阅」频道时加 `paddingBottom: 92`，滚动到底部时最后一条不被按钮盖住。
- footer 只剩状态文字，不再放订阅管理入口（单一入口原则）。
- 桌面右栅「今日速览」保留「刷新」与「订阅管理」两个按钮。

## 11.23 修手机端弹层（2026-11-14 22:00）

用户在 iPhone 上报两处：

1. AI 陪读弹层太小，要上滑才看得到「发送」；弹层没有盖住正文，文章页底部的「AI 陪读 / 收藏 / 原文」露在上面。
2. 订阅管理弹层太小，底部按钮只露一条边，点不到。

根因：`client/sheet.tsx` 用 `StyleSheet.absoluteFillObject` 展开定位。该常量在手机宿主运行时取不到，展开后是空对象。于是根容器与遮罩都没有定位样式，弹层按普通流排到内容后面，被屏幕裁切，遮罩也不显示。桌面端不受影响。

改法：

- 弹层定位改成逐条写死的 `FILL`（`position: absolute` + 四个 0），不再依赖 `StyleSheet.absoluteFillObject` 与 `StyleSheet.absoluteFill`。`client/subs-panel.tsx` 的搜索清空按钮等其它 `position: absolute` 写法本来就没问题。
- `LanternSheet` 新增 `footer` 参数：主操作放在滚动区外，常驻弹层底部。手机底部留白 36，桌面 30。
- AI 陪读：取消 / 发送移进 footer。
- 订阅管理：「导入 OPML / 导出 OPML」移进 footer，只在「已订阅」tab 显示。
- 弹层本体加 `flexShrink: 1`，内容长时由滚动区收缩，footer 不被挤出去。

验证：

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：桌面非紧凑布局截图 —— 陪读弹层居中、遮罩、按钮在底部；订阅弹层 footer 露出，导入导出可点。
- 已验证：桌面临时把 `compact` 强制为 true（模拟手机布局）截图 —— 弹层铺满整屏、正文与底部操作条被遮罩盖住、陪读 footer 的取消/发送常驻可见；订阅弹层在窗口高度 520 时贴底、导入导出完整可见，切到「发现」长列表时弹层升到 88% 高度并内部滚动。
- 已验证：真机 iPhone（2026-11-14 22:30 用户实机确认）：陪读弹层发送按钮直接可见、弹层盖住正文、订阅管理底部按钮可点。
- 未验证：深色模式、键盘弹出时的避让。

副作用（已与用户确认保留）：桌面弹层的主操作也从滚动区移到常驻底部，订阅管理的导入导出位置随之改变。

测试用临时改动 `client/screen.tsx` 的 `compact: true` 已还原，工作区只剩 `client/sheet.tsx`、`client/article.tsx`、`client/subs-panel.tsx` 三个文件。

## 11.24 手机正文页左滑返回（2026-11-15）

需求（用户原话）：「首页 AIHOT 精选、乔木频道到个人订阅之前可以通过左滑右滑切换」，「阅读完文章左滑退出」。

现状（2026-11-15 定稿）：**频道之间的左右滑动已按用户要求取消**，只保留正文页左滑返回。频道仍靠点标签切换。

做法：

- 新增 `client/swipe.ts` 的 `useHorizontalSwipe`。用 `PanResponder`，只在 `|dx| > 14` 且 `|dx| > |dy| * 2` 时才接管，竖向滚动仍归 ScrollView（已验证）。
- 松手时位移 ≥ 36 或速度 ≥ 0.25 px/ms 才算一次滑动。
- 只在正文页挂载（`client/article.tsx`）。列表页不挂手势，频道靠点标签切换；列表上横向拖动不会切频道，也不会触发任何操作。
- 正文页只接管左滑，右滑不接管（留给宿主的拉侧边栏）。第一版两个方向都做，用户实测后说右滑是宿主手势，改成一个方向。
- 用 `directions` 参数限定方向。不允许的方向在 `onMoveShouldSetPanResponder` 就直接返回 false，连接管都不做——否则会把宿主的侧边栏手势吃掉（不只是不响应）。
- 全部只在 `layout.compact`（手机布局）下挂载，桌面不受影响。

关键坑（已验证）：宿主会把滑动的最后一下同时当成一次点击。滑完会把手指下方的按钮或链接点开。

- 改法：`useHorizontalSwipe` 额外返回 `justSwiped()`，滑动接管与松手时打时间戳，500 ms 内返回 true。
- 正文页底部三个按钮与正文行内链接都先问 `justSwiped()`。正文链接这一条是实测出来的：第一版只护住了底部按钮，一次右拖误开了 `openExternalUrl`，把链接页在 Chrome 里打开了。

第二个坑（已验证，但跟直觉相反）：接管发生在手指已经走了十几像素之后，所以 `gestureState.dx` 从接管那一刻算起，比手势实际长度短一截。实测：拖 48 CSS px，读到 32 px；拖 32 px，读到 8 px。

- 后果：按最初的 72 门限，手指要真的拖近 100 px 才算一次滑动，用户反馈「太钝」。
- 改法：门限降到 36 px，另加「速度快也算」：`|dx| / 耗时 ≥ 0.25 px/ms`（250 px/s），小幅度快甩也认。
- 位移不再用松手事件的 `pageX`，改成移动过程中记下最大位移。松手事件的坐标会偏，实测差 8 CSS px。

验证（2026-11-15，桌面窗口改成 430×900 触发 `compact`，用 `mouse_event` 拖拽，截图逐张看）：

- 已验证：正文页左滑回列表；右滑不做任何事，停在正文（不接管，宿主手势可用）。
- 已验证：点一下条目照常开文。
- 已验证：滚轮竖向滚动正常，宽窗口（1280）回到两栏布局不变。
- 已验证：列表页横向拖动不再切频道（已取消）。
- 未验证：真机 iPhone 上的手感（门限按桌面鼠标定的）。
- 未验证：正文里横向表格与滑动的争夺。表格向右拖是否会被当成退出，尚未实测。
- 未验证：宿主的右滑拉侧边栏在正文页能否正常弹出。

## 11.25 去掉纸色底，改回宿主白底（2026-11-16）

用户反馈：「用了一段时间还是不要这个报纸颜色，改回原来的白色背景，其他东西不变」。

做法：只改颜色来源，布局、字标、橙色点缀不动。

- `client/style.ts` 的 `palette()` 不再返回写死的纸色，改为取宿主主题色：`paper` = `surface0`，`panel` = `surface1`，`ink` = `foreground`，`muted` = `foregroundMuted`，`rule` = `border`。深色模式跟着宿主走，不再有自定义深色纸色。
- 橙色点缀保留：浅色 `#B4501E`，深色 `#E2793C`。
- 新增 `onAccent`：`paper` 以前被当作橙底按钮上的文字色用，白底后会看不见，所以拆出这个字段。浅色 `#FFFFFF`，深色 `#1B1917`。
- 改 `onAccent` 的地方：`client/screen.tsx` 的重试按钮、确认按钮、右下角齿轮图标；`client/article.tsx` 的「发送」按钮；`client/subs-panel.tsx` 的实心按钮。

验证：

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：桌面截图 —— 列表页、正文页、订阅管理弹层都是白底；字标仍为墨色手写体；橙色下划线、未读方块、齿轮按钮在位；齿轮图标在橙底上是深色，清楚。
- 未验证：深色模式（没有切主题截图）、手机端。

## 11.26 读 X 长文：FxTwitter + 收藏并入订阅（2026-11-16）

用户要求两件事：正文能直接读 X 上的长文章；收藏频道并入订阅频道。

### 一、X 链接的正文走 FxTwitter

x.com 的页面要登录，直接抓只能拿到登录墙。FxTwitter 是第三方匿名 API，不用登录、不用 key，能拿到长推文全文与 X Article 正文。

- 新增 `server/sources/fxtwitter.ts`：`isXStatusUrl()`、`parseXStatusId()`、`fetchXPost()`。端点 `https://api.fxtwitter.com/status/<id>`，无 handle 也能用。
- 新增 `server/text/draftjs.ts`：把 X Article 的 draft-js 结构（`content.blocks` + `entityMap`）转 Markdown。支持段落、多级标题、引用、无序与有序列表、代码块、行内加粗与斜体、行内代码、链接、图片。
  - `entityMap` 每项是 `{ key, value: { type, data } }`，取 `value` 才是实体。
  - `MEDIA` 实体的 `data.mediaItems[0].mediaId` 要与 `media_entities[].media_id` 配对，两边前 16 位一致（19 位数字超过 JS 安全整数）。
  - `MARKDOWN` 实体的 `data.markdown` 本身就是带 ``` 围栏的代码块，原样输出。
- `server/page-article.ts` 的 `loadPage()`：URL 是 x.com 链接时先走 FxTwitter，抓不到再按原逻辑。
- 缓存照旧写进 `page-<sha1>.json`，有效期 7 天。

实测（2026-11-16）：

| 样本 | 结果 |
| --- | --- |
| 日文 X Article（Chrome 扩展 Muse 那篇） | 4836 字，5 个一级标题，2 条列表，2 张图，6 个代码块 |
| 长推文 note tweet（karpathy HackerTube） | 1306 字全文，标 `looksEnglish` |
| 普通网页（阮一峰周刊） | 10910 字，不受影响 |
| 连续 12 次请求 FxTwitter | 全部 200，没有限流 |

插件内实测：AIHOT 精选里的「通义千问发布 Qwen4 Max」（`x.com/Alibaba_Qwen/status/...`）原来抓不到正文，现在显示推文全文。

### 二、收藏并入订阅频道

- 频道标签从 5 个减到 4 个：精选 / 热点 / 乔木 / 订阅。收藏不再是标签。
- 订阅频道右下角有两个圆形按钮横排：左边星形是收藏，右边齿轮是订阅管理（2026-11-16 晚最终形态）。
- 点星形进入收藏列表；收藏视图里星形变成白底橙描边，再点一下就回订阅列表。两个按钮位置固定，不因切换而移动。
- 收藏视图顶部不再有返回行（同日删除）：进出只靠右下角的星形按钮。
- 收藏视图里不显示刷新按钮，桌面右栏速览显示「收藏」。底部的「N 条收藏」文字保留。
- 长按取消收藏只在收藏视图里生效，行为不变。
- 订阅列表底部留 96 像素空白，按钮不挡最后一条。

验证：桌面截图确认入口行、收藏列表、返回、右栏速览、FxTwitter 正文。

## 11.27 XFeed 频道（2026-11-16，同日删除）

曾新增第五个频道「XFeed AI」，当天按用户要求删除。下面保留当时的做法，方便以后重建。

新增第五个频道「XFeed AI」（标签写「X」）。

数据源：XFeed（xfeed.ai）没有公开 API，但站点自己的前端读公开静态 JSON：

- `https://xfeed.ai/data.json`：992 条，含 XFeed 写的中文标题 `displayTitle`、中文摘要 `displaySummary`、作者、原帖链接、类型、点赞数。
- 官方说推文数据每 3 小时更新，所以缓存 TTL 取 30 分钟。

做法：

- 新增 `server/sources/xfeed.ts`：拉 JSON，映射成 `FeedItem`（`source: "xfeed"`，标题用 `displayTitle`，摘要用 `displaySummary`，来源写作者名，链接是 x.com 原帖），按时间倒序。缓存键 `xfeed`，存全部条目，返回时截取 limit 条。
- `shared/feed.ts`：`CHANNELS` 加 `xfeed`，`channelIdSchema` 加 `xfeed`，`feedItemSchema` 的 `source` 枚举加 `xfeed`。
- `server/feed.ts`：加分支走 `fetchXfeed`。
- `client/screen.tsx`：标签行加「X」；XFeed 频道每条都显示摘要，标题统一用正文大小（不用头条的 26px）。
- `client/article.tsx`：正文页右上角频道名加「XFeed AI」；英文正文也给「译文」chip，翻译状态轮询的 `enabled` 条件要带上 `isXfeed`（第一版漏了，界面一直停在「翻译中」）。

验证：

- 已验证：服务端拉取 60 条，中文标题、中文摘要、作者、时间、类型都对。
- 已验证：桌面截图确认 5 个标签一行放下、每条带摘要、右栏速览显示「XFeed AI 60 条内容」。
- 已验证：点开英文条目，正文是 X 原文全文；点「译文」几秒后自动切到中文译文。
- 未验证：手机端；X Article 里的图片与代码块在插件里的渲染；FxTwitter 与 XFeed 的长期稳定性。

### 当天删除

用户试完说阅读体验不好，当天删掉：

- 删掉 `server/sources/xfeed.ts`，`server/feed.ts` 去掉 xfeed 分支，`shared/feed.ts` 的 `CHANNELS` 与 `channelIdSchema` 去掉 xfeed。
- `client/screen.tsx` 去掉「X」标签与 XFeed 专用的摘要显示。
- `feedItemSchema` 的 `source` 枚举保留 `xfeed`，只为兼容旧收藏快照；旧收藏里的 XFeed 条目仍能读正文（走 FxTwitter）并能翻中文译文。
- 缓存文件 `xfeed.json` 已删。

保留的部分：`server/sources/fxtwitter.ts` 与 `server/text/draftjs.ts`。任何订阅源里的 x.com 链接仍走这条链路读全文。

## 11.28 桌面换鸿蒙字体 + 右栏改居中（2026-11-18）

用户要求：桌面端文字改鸿蒙字体；报头手写字标不动；右栏「今日速览」改居中展示。手机端不动。

设计稿：`~/.paseo/projects/paseo-插件开发/work/lantern-type/index.html`（顶栏切字体，底部是字体样张；另有 B 版右栏稿）。

### 一、字体（`client/style.ts`）

`FONT.serif` / `FONT.sans` / `FONT.mono` 三个令牌只改 `Platform.select` 的 `default`（网页桌面）分支，改成 `'HarmonyOS Sans SC', system-ui, 'Microsoft YaHei', sans-serif`；`ios` / `android` 分支原样保留，所以手机没有任何变化。

令牌名不变，仍是 `serif` / `sans` / `mono`：桌面下三套都指向鸿蒙，调用处不用改。

### 二、字重降一档（700 → 600）

涉及的样式（不改内联加粗与 12px 小标签）：

- `client/screen.tsx`：`leadTitle`（26）、`itemTitle`（17）、`briefTitle`（24）、`briefCountNum`（30）、`dialogTitle`（17）。
- `client/article.tsx`：`title`（30 / 38）、`heading`（正文小标题）、`tableHeaderText`。
- `client/sheet.tsx`：弹层标题 `title`（19）。

保留 700 的：`channelTextActive`（12px 频道标签）、`retryText`、Markdown 行内加粗、实心按钮文字（本来就是 600）。

### 三、右栏「今日速览」B 版（`client/screen.tsx`）

结构：`brief` 容器居中且 `flex: 1`（垂直居中）→ 内层 `briefBlock`（宽 100%，maxWidth 420，居中）→ 标题 / 橙色短线 `/` 日期+频道+条数（`briefTight`）`/` 1px 细线 `/` 最新一条标题与署名；主操作 `briefActions` 在块外，同样居中。

新增样式：`briefBlock`、`briefTight`、`briefRule`（40×2 橙色）、`briefDivider`（1px 边框色）。所有文字节点加了 `textAlign: "center"`。

### 四、验证

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：客户端禁用 API 扫描 0 命中（`document.` / `window.` / `localStorage` / `navigator.` / `className=` / `onClick=` / 原生 HTML 标签）。
- 已验证：`paseo plugin reload paseo-lantern` 后状态 `running`。
- 已验证（真机界面截图）：右栏是 B 版 —— 标题居中、橙色短线、日期/频道/条数一组、1px 细线、最新标题两行居中、`刷新` 按钮居中。点开文章后右侧读正文也正常。
- 已验证（字形测量）：桌面 renderer 的 `--device-scale-factor=1.25`；截图 OCR 得标题首行墨迹宽 392 设备像素 ≈ 310 CSS px。用 canvas 在 Chromium 里量同一串：鸿蒙 315.3 CSS、微软雅黑 331.1 CSS。实测 310 接近鸿蒙，确认实际渲染的是鸿蒙而不是兑底字体。
- 未验证：手机端（`ios` / `android` 分支没改，但没上真机看）。
- 未验证：深色模式下的新字体与新右栏。

### 六、桌面右栏正文改小（2026-11-18，同日）

用户看图后说「右栏的标题和正文字体都太大，标题跟左边的 the lantern 差不多大就行」。改 `client/article.tsx`：

| 项 | 手机（compact） | 桌面（原） | 桌面（现在） |
| --- | --- | --- | --- |
| 正文标题 | 30 / 39 | 38 / 49 | 28 / 37 |
| 正文段落 | 16.5 | 16.5 | 15.5 |
| 正文小标题 | 20 / 17 | 20 / 17 | 18 / 16 |

已验证（真机截图）：标题从四行变三行，正文变细一档；左栏列表与字标尺寸未动。未验证：手机端（compact 分支未改）。

### 七、右栏去日期，刷新只留图标（2026-11-18，同日）

- 删掉「今天 11月18日」一行：`client/screen.tsx` 的 `briefDate` 样式、对应 `Text`、`formatTodayShort()`、`today` memo 一并清掉。现在全项目没有「今天 M月D日」这种文案。
- 刷新按钮变纯图标：新样式 `briefIcon`（40×40 热区，无边框无文字），图标 `RotateCw` 17，刷新中变橙色。无障碍标签仍为「刷新」。
- 「订阅管理」按钮不变，仍带边框与文字（用户只要求改刷新）。

已验证（真机截图）：右栏只剩「今日速览 / 橙线 / 频道 / 条数 / 细线 / 最新标题 / 署名 / 圆形刷新图标」。设计稿 `work/lantern-type/index.html` 已同步。

### 八、左栏头条降24（2026-11-18，同日）

`client/screen.tsx` 的 `leadTitle`：26 / 行高 36.4 → 24 / 33.6，字重仍 600。因此与右栏正文标题（28）错开 4px，层级不再持平。已验证：`tsc` 0 错误；真机界面首屏头条变为三行。

注：字标「The Lantern」的墨迹高约 62 CSS px（图 915×168 缩到 338 宽），换算成字号约 80px，字面「跟字标一样大」做不得，所以按「明显降一档」处理。

### 九、订阅管理改在右栏内联展示（只改桌面）

用户要求：去掉右栏的「订阅管理」按钮（左侧已有齿轮）；桌面点齿轮时，订阅管理直接开在右栏，不再弹层。手机不动。

做法：

- `client/subs-panel.tsx` 新增 `variant?: "sheet" | "pane"`（默认 `sheet`）。内容抽成 `body`（tab 条 + 已订阅 / 发现），两种形态共用。
  - `sheet`：仍是 `LanternSheet`，行为与之前完全一致（手机走这条）。
  - `pane`：自绘右栏页 —— `paneHead`（标题「订阅管理」+ 右上 X）、`ScrollView`（内容封顶 620 居中）、`paneFooter`（导入 / 导出 OPML 常驻底部）。
- `client/screen.tsx`：
  - 删除右栏底部的「订阅管理」按钮与对应样式（`briefAction` / `briefActionText`）。
  - 列表里的 `SubsPanel` 改为 `open={subsOpen && layout.compact}`，桌面不开弹层。
  - 桌面分支：`subsOpen` 时右栏渲染 `<SubsPanel variant="pane" />`，否则 `articlePane ?? brief`。
  - 齿轮 FAB 改为开关（`setSubsOpen(!subsOpen)`）；切频道、点收藏、点列表条目时 `setSubsOpen(false)`。

已验证（真机界面）：点齿轮右栏变订阅管理（已订阅 / 发现两个 tab、删除、导入导出都可用）；点列表条目会切回正文；右栏已无「订阅管理」按钮。已验证：`tsc` 0 错误；客户端禁用 API 扫 0 命中。已验证：桌面与手机均由用户实机点过（2026-11-18）。

### 十、右栏内联页的留白与关闭方式（2026-11-18，同日）

用户反馈：右栏内容贴左边缘；关闭按钮多余，因为再按齿轮就会返回；手机端的关闭按钮也去掉。

- `client/subs-panel.tsx`：`paneContent` / `paneFooter` 加 `paddingHorizontal: 30`，`maxWidth` 620 → 680；`paneHead` 去 X，标题居中。
- `client/sheet.tsx`：`LanternSheet` 新增 `closeButton`（默认 `true`）。订阅管理传 `false`，标题栏不画关闭按钮；AI 陪读与取消收藏保持原样。

关闭方式：桌面再按一次齿轮（FAB 是开关），或点列表条目 / 切频道；手机点遮罩关闭。

已验证（真机界面）：右栏标题居中无 X，列表与搜索框左右各留 30 的空隙，已订阅 / 发现两个 tab 都正常；再按齿轮回到速览。已验证：手机端无 X 后的关闭方式由用户实机确认可用（2026-11-18）。

### 五、隶到的坑

- 本机 Chrome headless 用 `--screenshot` 写文件会报「拒绝访问 (0x5)」，写系统盘也一样。改用 ego-browser 的 `page.screenshot({ path })`。
- Paseo 桌面 renderer 的 `--device-scale-factor=1.25`：窗口截图是设备像素，算 CSS 尺寸要除 1.25，否则会误判换行与字号。

## 11.29 宿主升 0.16.1，陪读改为写进输入框（2026-11-18）

用户要求：做交接文档第 12 节的第 6 项，此时本机已是 Paseo 0.16.1。

改动：

- `package.json`：`@getpaseo/plugin` 由 `0.15.4` 升到 `0.16.1`（`npm install --save-dev`）。
- `paseo-plugin.json`：`requirements.paseo` 改 `>=0.16.1`。
- `client/article.tsx`：`sendCompanion()` 换成 `writeCompanion()`；导入 `useComposers`；组件顶层加 `const companionComposers = useComposers({ agentId: companion.agentId ?? "" })`；写入用 `insertText`（输入框非空时补 `\n\n`），再 `focus()`。
- 弹窗文案：「写进最近活跃 agent 的输入框，不自动发」；按钮「写进输入框」（写入中显示「写入中」）；toast「已写进 X 的输入框」。

踩到的坑：

- `paseo.composers(...)` 在类型上不在 `usePaseo()` 返回的 `PluginPaseoApi` 上，写 `paseo.composers` 报 TS2339。只能用 `useComposers` hook，而且不能在点击回调里调。
- 宿主实现里确实有 `composers`（`app-dist` 里 `composers:o=>(0,n.pluginComposersSource)(c).resolve(o)`），但类型没暴露到 `PluginPaseoApi`。

验证（2026-11-18）：

- 已验证：`npx tsc --noEmit` 退出码 0（升包后、改代码后各跑一次）。
- 已验证：`paseo plugin reload paseo-lantern` 后状态 `running`，日志出现 `Plugin ready`。
- 已验证：真机点开提灯 → 点文章 → 点「AI 陪读」→ 弹窗文案与按钮为新文案；点「写进输入框」后宿主跳到目标 agent 标签页，输入框里出现完整提示词（标题、来源、链接），没有发出去。
- 已验证：验证完用 `ctrl+a` + `Delete` 清空了那个输入框。
- 未验证：手机端的同样操作。

## 11.30 手机侧边栏看不到提灯（2026-11-18）

现象：电脑上侧边栏有「提灯」，手机上没有。插件本身 `running`。

原因（已验证）：宿主的 `assertPluginCompatibility()` 比对 App 版本与 `requirements.paseo`。我把要求写成 `>=0.16.1`，而手机 App 是 **0.16.0**，于是手机直接跳过这个插件的全部客户端贡献（侧边栏行、屏幕、面板一起消失），界面上不报错。

证据：

- `~/.paseo/daemon.log` 里 relay 客户端 `cid_08df3a3c...` 的 `appVersion` 是 `0.16.0`；本机 loopback 客户端是 `0.16.1`。
- 桌面 App 打包的 `app-dist/.../index-*.js` 里有校验函数：App 版本不满足 `requirements.paseo` 时抛错 `Plugin "<id>" requires Paseo <range>`，客户端贡献不加载。

处理：`paseo-plugin.json` 的 `requirements.paseo` 改回 `>=0.16.0`。已核对 `@getpaseo/plugin@0.16.0` 也导出 `useComposers`，`insertText` 与 `focus` 签名一致，所以 0.16.0 够用。

验证（2026-11-18）：

- 已验证：`paseo plugin reload paseo-lantern` 后状态 `running`。
- 已验证：`@getpaseo/plugin@0.16.0` 的 `dist/client/index.d.ts` 有 `useComposer` 与 `useComposers`；`composer.d.ts` 有 `insertText` 与 `focus`。
- 已验证：手机上侧边栏「提灯」已恢复（2026-11-18 用户实机确认，手机 App 更新后可见）。

#lesson 抬 `requirements.paseo` 之前先查手机端 App 版本。宿主不满足要求时静默跳过，界面上只表现为「插件不见了」。

## 11.31 陪读改成在 the-lantern 项目里开新对话（2026-11-18）

用户要求：直接在 Paseo 里开一个叫「the lantern」的 workspace；点陪读写输入框时，自动开一个新对话。

做法：

- 新建 workspace：`paseo workspace create --isolation local --title "the lantern" --path "C:\Users\edcccc\.paseo\the-lantern"`，得到 `wks_0eb6ed2a888c4543`，项目名 `the-lantern`。
- `client/article.tsx`：
  - 常量 `COMPANION_PROJECT = "the-lantern"`；`normalizeName()` 把空格与下划线并成连字符再比对项目名或目录末段。
  - `openCompanion()` 只拼提示词开弹窗，不再去查最近活跃的 agent。
  - `writeCompanion()`：`paseo.projects.list()` 找 the-lantern → `paseo.workspaces.open({ cwd: 项目目录 })` 复用或新建 workspace → `paseo.agents.list()` 取最近活跃 agent 的 provider/model/mode/thinking 当模板 → `paseo.workspaces.ref(id).agents.create({ config, title })` 建新对话 → 把新 agent id 存进 state。
  - `useEffect`：`companionComposers[0]` 出现后 `insertText` + `focus()`，弹窗关闭；12 秒没出现就报错，不静默卡住。用 `companionWrote` ref 防重复写入。
  - 弹窗文案：「在 the lantern 里开一个新对话，把提示词写进它的输入框，不自动发」；按钮「开新对话」/「建对话中」/「写入中」。
- 新对话标题取文章标题前 24 字。

为什么照最近活跃 agent 建：`agents.create` 必须给 `config.provider`（`provider/model` 格式），插件没有自己的模型设置，照用户当前在用的模型最省事。

验证（2026-11-18，桌面实机）：

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：点「开新对话」后按钮变「建对话中」，`paseo ls` 出现新 agent `60835625-af83-4ab3-91ed-8db90194059a`，标题「腾讯混元 Hy4 flash 开放权重，含 FP…」，`cwd` 为 `~\.paseo\the-lantern`，状态 `idle`。
- 已验证：界面跳到 workspace「the lantern」的该标签页，输入框里有完整提示词，没有发出。
- 未验证：手机端同样操作；the lantern 里没有 agent 时的模板回退（现在没有可用的活跃 agent 会直接报错）。

### 11.31.1 手机报「找不到 workspace」后的修正（2026-11-18 13:10）

现象：手机上点「开新对话」报「找不到名为「the lantern」的 workspace」，桌面上同样的操作却正常。

排查：`paseo workspace ls` 里已经没有 the-lantern 项目的 workspace，但 `paseo project ls` 里项目还在。`~/.paseo/agents/C-Users-edcccc-.paseo-the-lantern/` 下两个 agent 的 `archivedAt` 都是 `2026-11-18T04:58:30Z`。这两个对话被归档后，那个 workspace 就不再算 active，按名字查列表也就查不到。

修正：不再依赖已有 workspace。改成先按项目名（或目录末段）找项目，再用 `paseo.workspaces.open({ cwd: projectRootPath })` 复用或新建 workspace。`open` 对已有目录返回现有 workspace，没有就建。

已验证（2026-11-18 桌面）：改前 workspace 确实不在 `workspace ls` 里；点一次「开新对话」后，`workspace ls` 重新出现 `the lantern`（cwd `C:\Users\edcccc\.paseo\the-lantern`），`paseo ls` 出现新对话，输入框里有提示词且没有发出。

未验证：手机端同样操作。

## 11.32 开新对话提速：弹窗打开就预建（2026-11-18）

用户反馈：开新对话慢。实测（桌面，8 FPS 录帧，点「开新对话」到输入框出现提示词）：

- 改前：约 3.6 秒。
- 改后：约 1.5–1.7 秒。点下去约 1.5 秒跳到新对话并看到提示词。

做法（`client/article.tsx`）：

- 拆出 `createCompanionAgent(title)`：`projects.list()` 与 `agents.list()` 用 `Promise.all` 并行，再 `workspaces.open({ cwd })`、`agents.create({ config, title })`。
- 新增 `prefetchCompanion()`：弹窗一打开就在后台建对话，结果存 `spareAgentId`；正在建时存 `sparePending`，避免重复建。
- 点「开新对话」时直接用 `spareAgentId`（没有就等 `sparePending`，再没有才现场建），所以建对话的 2 秒从点击路径上消失。
- 取消弹窗不删除已建好的对话：它成为下次的 spare，最多留一个，不会每次取消都堆。

剩下的 1.5 秒是宿主切换 workspace / 标签页并挂载输入框的时间，插件侧改不动。

验证（2026-11-18 桌面）：

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：`computer_record watch` 录帧计时，点击到输入框出现提示词从 ~3.6 秒降到 ~1.5 秒。
- 已验证：一次弹窗只建一个对话（`~/.paseo/agents/C-Users-edcccc-.paseo-the-lantern/` 里的文件数只 +1）。
- 未验证：手机端实际手感；多次取消后 spare 复用是否正常（逻辑上会复用，没有实测第二轮取消）。

## 11.33 收藏页加分类：文章 / GitHub 收藏（2026-11-18）

用户要求：不新增频道，直接在「收藏」里分两类——文章、GitHub 收藏。

做法：

- `shared/feed.ts`：`channelIdSchema` 加 `github-stars`（只给收藏页用，不进频道栏）；`feedItemSchema.source` 加 `github`。新增 `GITHUB_CHANNEL` 常量。
- `server/sources/github.ts`（新增）：`GET https://api.github.com/users/{login}/starred?per_page=100`，匿名可读，最多翻 3 页；账号默认 `edccce64`，可用环境变量 `LANTERN_GITHUB_LOGIN` 覆盖。条目 `id` = `github:<owner>/<repo>`，`origin` = `语言 · ★星数`，`publishedAt` = 最近提交时间，按提交时间倒序；缓存 key `github-stars`，TTL 30 分钟。
- `server/github-article.ts`（新增）：正文 = 仓库 README。依次试 `README.md` / `readme.md` / `README` / `Readme.md` / `README.markdown`；缓存 24 小时；把相对图片改成 `raw.githubusercontent.com/...`、相对链接改成 `github.com/.../blob/...`；把 README 里常见的 HTML `<img>` / `<a>` 转成 Markdown，其余标签剥掉，常见实体解码。
- `server/feed.ts`、`server/article.ts`：各加一路分发（`id` 以 `github:` 开头就走 README）。
- `client/screen.tsx`：收藏页顶部加两个分类「文章 / GitHub 收藏」；GitHub 分类才联网（`enabled`），取 100 条；`sourceName()` 对 github 条目用 `origin`（否则只显示 owner）；下拉刷新、错误提示、空状态按分类区分。
- `client/article.tsx`：`channelName()` 认 `github` → 「GitHub 收藏」。译文 chip 不出现（`looksEnglish` 为 false）。

验证（2026-11-18 桌面）：

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：收藏页出现「文章 / GitHub 收藏」两个分类；切到 GitHub 后有 94 条，与 `gh api /users/edccce64/starred --jq length` 一致；缓存文件 `~/.paseo/data/paseo-lantern/github-stars.json` 94 条。
- 已验证：点开 `getpaseo/paseo`，README 正文出现，星标与 release 徽章图片能显示，署名显示 `getpaseo · NOV 18, 2026 · 13:34`，右上角分类写「GitHub 收藏」。
- 已验证：`3441293738/creatorhub` 的 HTML `<img>` 被转成 Markdown 图片，不再显示成一串 HTML 源码（SVG 图在列表里看不到，未确认是否渲染）。
- 未验证：手机端；没有 README 的仓库提示；GitHub 返回 429 时的「离线缓存」分支。

已知限制：

- 只看得到公开收藏，私有仓库与隐藏收藏不会出现。
- 匿名限额 60 次/小时/IP；列表 30 分钟刷一次，正常够用。
- README 的 SVG 图可能不渲染（RN Image 限制），PNG/JPG 正常。
- 收藏页列表条数上限 100；收藏超过 100 时只看得到最近提交的前 100 个。

## 11.34 收藏页与「今日速览」加刷新按钮（2026-11-18）

用户要求：今日速览下面加刷新按钮；收藏那里也加一个。

改动（`client/screen.tsx`）：

- 收藏页刷新图标：2026-11-18 当天加了，随后按用户要求删掉（手机上拉刷新就够，桌面用「今日速览」的刷新）。
- 「今日速览」的刷新图标不再对收藏视图隐藏；只在收藏页的文章分类里隐藏（没有可重取的数据）。
- 「今日速览」的频道名按分类显示：`GitHub 收藏` / `收藏` / 当前频道全名。
- 两个按钮共用 `refresh()`，刷新期间 `refreshing` 为真，图标变橙、按钮禁用。

验证（2026-11-18 桌面）：

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：GitHub 分类下分类行右侧出现刷新图标；「今日速览」显示「GitHub 收藏 / 94 条内容」并带刷新图标。
- 已验证：点「今日速览」的刷新图标，图标变橙，`~/.paseo/data/paseo-lantern/github-stars.json` 的 `fetchedAt` 更新到 15:33，条数仍 94。
- 未验证：手机端。
## 11.35 收藏页改成两张卡片入口（2026-11-18）

用户反馈：GitHub 收藏和文章挤在一起用「小字 tab」切换，层级奇怪。选了排版方案 B。

改动（`client/screen.tsx`）：

- 收藏页顶部由小字下划线 tab 换成两张卡片：`文章 <数量> 星标的资讯` / `仓库 <数量> GitHub 收藏`。选中卡片描边变橙、数字变橙，另一张留在次级面。
- 仓库数量在打开收藏页时就取（`githubQuery` 的 `enabled` 改成 `showStar`），所以没点进去也能看到 94 这样的数字。
- 删掉收藏页分类行里的刷新图标：手机靠下拉刷新，桌面靠「今日速览」的刷新。

验证（2026-11-18 桌面）：

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：收藏页出现两张卡片，显示「文章 1 / 仓库 94」，未点进仓库分类时数字已经是对的。
- 已验证：点「仓库」卡片后列表切成仓库列表，「今日速览」同步显示「GitHub 收藏 / 94 条内容」，刷新图标保留。
- 未验证：手机端卡片排版与下拉刷新。

排版草稿在 `~/.paseo/projects/paseo-插件开发/work/lantern-star-layouts/`（A/B/C/D 四案 HTML + 截图，B 已落地）。
## 11.36 收藏独立成频道，夹在乔木与订阅之间（2026-11-18）

用户要求：收藏别再藏在订阅里，独立成一个频道，位置在乔木和订阅之间；卡片形式保留，两张卡片放到搜索框下面。

改动：

- `shared/feed.ts`：新增 `STAR_CHANNEL = "star"`，`channelIdSchema` 加 `star`；`ChannelId` 类型包含它。
- `server/feed.ts`：收到 `star` 直接抛错，收藏是客户端本地数据，不该走服务端。
- `client/screen.tsx`：
  - `CHANNELS` 在「乔木」与「订阅」之间插入 `{ id: "star", title: "收藏", full: "收藏" }`，频道栏变成 5 个。
  - 删掉 `showStar` 状态与「我的订阅」里的星标浮动按钮；`isStarView` 改成 `channel === "star"`。
  - 主列表查询加 `enabled: channel !== "star"`，避免对收藏频道发无意义的请求。
  - 两张卡片移到搜索框下面；搜索框在收藏频道也显示（`rawData.length > 0 || isStarView`）。
  - 「订阅」页只剩「订阅管理」一个浮动按钮。

验证（2026-11-18 桌面）：

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：频道栏变成「精选 / 热点 / 乔木 / 收藏 / 订阅」五个，收藏在乔木与订阅之间。
- 已验证：进收藏频道后顺序是 搜索框 → 两张卡片（文章 1 / 仓库 94）→ 列表；下「今日速览」显示「收藏 / 1 条内容」。
- 已验证：点「仓库」卡片，列表切成仓库，「今日速览」变「GitHub 收藏 / 94 条内容」，刷新图标还在。
- 未验证：手机端 5 个频道标签是否挤（桌面左列 380 宽下没换行）；手机下拉刷新。
## 11.37 GitHub 收藏加原文 / 译文（2026-11-18）

用户要求：仓库正文也要有「原文 / 译文」。同时反馈手机端刷新可用、五个频道标签不挤。

改动：

- `server/github-article.ts`：接受 `version`；读 `readTranslation(id)` 决定有没有译文；`looksEnglish` 用 `isMostlyEnglish()` 判断 README；`version === "translation"` 且已有译文时返回译文。
- `server/article.ts`：把 `version` 传给 `fetchGithubArticle`。
- `server/translate.ts`：`id` 以 `github:` 开头时改走 `fetchGithubArticle` 取正文，不再去抓网页。
- `client/article.tsx`：新增 `isGithub`，把它加进译文状态轮询、`showTranslate`、「译文 chip 可点」三处条件。

验证（2026-11-18 桌面）：

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：打开 `nexu-io/openmotion`，正文顶部出现「原文 / 译文」两个 chip，默认原文。
- 已验证：点「译文」后 chip 变「翻译 0/47」，正文下方出现「正在翻译 0/47 段」；约 1 分多钟后译文落盘 `~/.paseo/data/paseo-lantern/translations/7b4c33a93bac9b8b.json`，页面切到译文，标注「来自仓库 README 的译文」。
- 已验证（用户实机）：手机端下拉刷新可用；五个频道标签在手机上不挤。
- 未验证：翻译失败态（key 缺失 / 429）在仓库正文上的表现。

注意：README 动辄几十段，长 README 一次翻译约 1 分钟，属于 DeepSeek 分段并发（6 路）。
## 11.38 仓库的 AI 陪读换成四段版提示词（2026-11-18）

用户要求：GitHub 收藏的陪读和文章不一样，要「用大白话讲这个项目是干嘛的、对我有什么帮助、怎么用（分步骤）、最后附链接」。先给草稿确认，再落到代码。

改动（`client/companion.ts`、`client/article.tsx`）：

- 新增 `buildRepoCompanionPrompt(item)` 与 `companionPromptFor(item)`：`item.source === "github"` 走四段版，其余仍走文章版。
- 四段：一、这是什么（一句话 + 核心做法 + 和同类比）；二、对我有什么用（能用的场景、用不上的场景）；三、怎么用（前提 / 安装 / 第一次跑通 / 常见配置，每步写清做完该看到什么）；四、链接（主页、文档、安装页）。
- 提示词尾部字段改成四个：`仓库`、`作者`、`语言`（含星数）、`链接`。作者取 `site`，缺失时取仓库名前一段。
- 硬性要求写进提示词：「先读 README 再回答，不要凭仓库名猜」「专业名词第一次出现用一句人话解释」「不确定就直说要查文档，不要编」「命令、产品名、仓库名保留原文」。
- 未加：我的个人背景（用户没确认）；风险与不适合场景单列一段（草稿里没有）。

验证（2026-11-18 桌面）：

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：打开 `nexu-io/openmotion` 点「AI 陪读」，弹窗里的提示词是「这个仓库是做什么的，用大白话讲，不要堆术语。请按这四段回答：一、这是什么…二、对我有什么用…」。
- 已验证：文章频道（AIHOT）的陪读仍是原来的文章版提示词（代码按 `source` 分支，未改文章版内容）。
- 未验证：实际发给 agent 后的回答质量；手机端弹窗排版。
## 11.39 手机返回列表保留滚动位置（2026-11-20）

问题：手机读完一篇文章返回列表，列表回到顶部，要重新往下刷。

原因：`client/screen.tsx` 手机端原本写 `return articlePane ?? listPane`。打开文章时列表整个卸载，返回时重新挂载，`FlatList` 的滚动位置清零。

做法：手机端列表不再卸载，文章盖在上面。

- 新增样式 `articleOverlay`：`position: absolute` 加 top/left/right/bottom 全 0，背景 `palette.paper`。定位逐条写死，不用 `StyleSheet.absoluteFillObject`（见 11.23 的坑）。
- 手机端返回值改成：`<View style={styles.screen}>` 里放 `listPane`，再按 `articlePane` 是否存在决定要不要叠一层 `articleOverlay`。
- 桌面两栏没动，桌面本来就是列表常驻。

效果：返回列表时仍停在那篇文章的位置。列表的其他状态（搜索词、频道、刷新状态）也跟着保留。

验证（2026-11-20，桌面窗口改430×900 触发 compact）：

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：滚动列表到「Gemini 4 Neon / Karina Nguyen / Google 在 Gemini API 推出 Tool Retrieval」一段，点开 Karina Nguyen 那篇，文章占满全屏，点左上返回，列表仍停在同一位置（顶部还是「The Verge 05:59」那条），不是顶部。
- 已验证：文章打开时列表不透出，遮罩层完全盖住。
- 已验证：已读圆点在返回后消失（读状态正常写入）。
- 已验证：手机真机 — 用户 2026-11-20 实机确认：读完文章返回列表，仍停在原文章位置，不再回顶部。
- 已验证：左滑返回 — 用户 2026-11-20 在手机实机试过：左滑回列表，列表同样停在原文章位置。

---

## 12. 下次开工建议

下一步优先级（按用户实际反馈排）：

1. **深色模式走一遍**。字标已备奶油色版本，`palette()` 会自动反相，但没实际切过主题。
2. 陪读目标改成可手选 agent（现在只能取最近活跃的一个）。

---

## 13. 提交记录

只记功能提交；docs 提交不记提交号，确认最新 HEAD 用 `git log -1`。

```
9b9b093 fix: keep the list mounted on mobile so the scroll position survives
6b36ab1 feat: give github repos their own companion prompt
b53c762 feat: add a refresh control to the star page and its brief
c3ce26c feat: split the star page into articles and github stars
1c1000c perf: create the companion conversation when the dialog opens
e0e6e9c fix: resolve the companion workspace through the the-lantern project
e7b22c8 feat: start a fresh conversation in the lantern for the companion prompt
6b57799 fix: accept Paseo 0.16.0 so the phone loads the plugin
3952290 feat: write the companion prompt into the agent composer
b26530a feat: add hand-picked recommended sources to the discover tab
0cb3e76 docs: add README and MIT license for open-source release
b9b1913 chore: ignore local env files and drop machine paths from docs
a68c50c docs: record the mobile check for the sheet fix
7d7d9a6 fix: anchor the sheet to the screen and pin the primary actions
4846bf5 docs: bring the handoff up to date with the gazette redesign
e42b57b refine: centre the article header and enlarge the title
e7d811b feat: replace the host modal with a themed sheet
31d8d3a refine: bind the title and byline into one block
8e75725 refine: move the byline under the title and drop the drop cap
8d1af4b refine: give the wordmark more room above and below
5773a94 refine: let the wordmark own the masthead and drop the refresh button
856e381 feat: hand-lettered wordmark for the masthead
a7b8eef refine: use an english masthead and drop the decorative rules
d51df86 polish: read tables, reset scroll, and drop boilerplate lines
02b55c2 polish: fill the gaps left in the list, subscriptions, and feed sources
179a9fd feat: rebuild list, article, and subscription sheet in the gazette style
6569144 fix: align list titles, unify time format, move subscribe entry to footer
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

远端：`https://github.com/edccce64/paseo-lantern`（origin）。

---

## 14. 验收清单（手机上逐条点）

1. 侧边栏能看到「提灯」，在 Idealoft 下面。
2. 点进去，AIHOT 精选有条目。
3. 切到乔木精选，标题是中文。
4. 点开一篇，正文能读，图片能显示。
5. 点「乔木改写」，有则显示中文稿。
6. 切到「我的订阅」，能看到少数派、阮一峰和 TechCrunch AI 的条目。
7. 点「订阅管理」，弹窗在手机上从底部升起。
8. 在列表下拉刷新，底部状态文字的时间变化。（报头的刷新按钮已删，只靠下拉）
9. 打开一篇文章点「AI 陪读」，弹窗只显示提示词，不显示 agent 名。
10. 点「发送」，那个 agent 收到消息。（已验证 2026-11-12 18:20）
11. 深色模式下文字颜色正常。
12. 打开一篇 TechCrunch 英文文章，标题下面有「原文 / 译文」两个切换。（已验证 2026-11-13）
13. 点「译文」，字号不变但文字变成「翻译 x/4」，不跳页。（已验证 2026-11-13）
14. 翻完后自动切到中文稿，切换项显示「译文」并带橙色下划线。（已验证 2026-11-13）
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
25. 报头手写字标 `The Lantern` 在 375pt 屏上完整显示、不被裁切。（桌面已验证，手机已验证 2026-11-20）
26. 正文标题 30pt 居中、署名紧跟其下、上下留白对称。（桌面已验证，手机已验证 2026-11-20）
27. 弹层（订阅管理 / AI 陪读 / 取消收藏）跟随宿主底色，标题栏也是同色。（桌面已验证，手机已验证 2026-11-20）
28. 订阅频道右下角橙色齿轮常驻，滚到底部时最后一条不被遮挡。（桌面已验证，手机已验证 2026-11-20）
29. 手机键盘弹出时，订阅弹层里的搜索与 RSS 输入框不被遮。（已验证 2026-11-20）
30. 深色模式下字标自动换成奶油色版本。（代码已备，未验证）
31. 首页在精选 / 热点 / 乔木之间左右滑能切频道，滑到头不再继续。（功能已取消，见第 33 条）
32. 正文页左滑一下就回列表；右滑不退出（留给宿主的侧边栏）；滑动不会顺带点开文章、底部按钮或正文链接。（桌面已验证，手机已验证 2026-11-20）
33. 首页左右滑动不再切频道（已按要求取消）。
34. 桌面右栏只有「今日速览 / 橙线 / 频道 / 条数 / 细线 / 最新标题 / 署名 / 刷新图标」，没有日期行也没有「订阅管理」按钮。（已验证 2026-11-18）
35. 桌面点右侧齿轮，订阅管理开在右栏；再按一次齿轮回速览；点列表条目切回正文。手机点齿轮仍是从底部升起的弹层。（已验证 2026-11-18，用户实机）
36. 桌面与手机的文字都是鸿蒙字体，标题字重 600。（已验证 2026-11-18，用户实机）
37. 订阅管理弹层（手机）没有右上角关闭按钮，点遮罩可关。（已验证 2026-11-18，用户实机）
