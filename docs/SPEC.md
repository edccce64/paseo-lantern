# 提灯 paseo-lantern · Paseo 插件规格书

- 版本：v1（2026-11-12）
- 状态：需求已确认，未开始编码
- 项目目录：`C:\Users\edcccc\.paseo\projects\paseo-lantern`
- 插件 id：`paseo-lantern`　显示名：`提灯`（副标题：资讯陪读）
- 目标宿主：本机 Paseo daemon `0.15.4`

命名含义：lantern 是提灯。信息海里点一盏灯，读到不懂的地方就有人陪你照一照。中英文都好读，方便写进 id。

---

## 1. 一句话

在 Paseo 里读 AIHOT 和乔木 RSS，看到不懂的文章，一键把文章递给当前 agent 陪你读。

## 2. 已确认的决策

| # | 决策项 | 结论 |
| --- | --- | --- |
| 1 | 使用端 | 两个都要，**手机优先**。手机为全屏页，桌面为可并排的工作区面板，共用一套组件 |
| 2 | 个人订阅抓取 | daemon 自己抓（RSS/Atom），不依赖乔木账号 |
| 3 | 正文 | daemon 抓原文并抽取正文，失败退回摘要 |
| 4 | 已读/收藏 | 存 host，跨设备同步 |
| 5 | 媒体 | 只做图文，不做播客、不做音频播放 |
| 6 | 缺失中文版 | 「我的订阅」的英文正文点一下「译文」，服务端直接调翻译接口，不经过 agent。乔木侧不做 |
| 7 | 陪读目标 | 当前工作区最近活跃的 agent；写入输入框，不直接发送 |
| 8 | 验收 | 用户本人在 iPhone 上验收 |

## 3. 环境事实（已核实）

- daemon `0.15.4`，托管于桌面端，监听 `127.0.0.1:6767`，`serverId: srv_pnMpyAxcMJTR`。
- CLI 路径 `D:\paseo\resources\bin\paseo.cmd`。它**不在** PATH 里，`paseo` 直接调用会 command not found。
- 已有同类工程 `C:\Users\edcccc\projects\paseo-idealoft`，`requirements.paseo: ">=0.15.4"`，可作结构参照。
- 乔木源码 `joeseesun/qmreader`、`qmreader-ios`、`qiaomu-ai-rss` 均为 MIT。
- `qiaomu-rss-dsh` 为 **GPL-3.0-only**。本项目只照功能重写，**不复制其代码**。
- AIHOT 引擎 `KKKKhazix/AIHOT` 为 MIT，且提供匿名只读 API。

## 4. 不做的事

- 不做播客与音频播放。
- 不做笔记、划线、日记、Obsidian 写入。
- 不做账号体系、不做服务端部署。
- 不做对外分发（除非先取得 AIHOT 书面授权）。
- 不复制 `qiaomu-rss-dsh` 的任何代码。
- 不读乔木的「读者社区」频道（已确认不做）。
- 不镜像全文到公开位置，只在本机缓存。

## 5. 数据源

### 5.1 AIHOT（公开只读，无需 Key）

| 用途 | 接口 |
| --- | --- |
| 精选流 | `GET https://aihot.news/api/v1/items?mode=selected&window=24h&limit=&cursor=` |
| 全部动态 | 同上，`mode=all&window=7d` |
| 热点榜 | `GET /api/v1/hot-topics`（Top 10，带 `rank`，`links.story`） |
| 事件详情 | `GET /api/v1/stories/{publicId}`，publicId 只能从热点榜取 |
| 日报 | `GET /api/v1/dailies/latest` |
| 增量 | `GET /api/v1/selected/snapshot` 一次，之后 `GET /api/v1/selected/changes` |

约束：

- **AIHOT 不提供单篇正文接口**。官方明确禁止猜 `/api/v1/items/{id}`。
- 所以 AIHOT 条目一律为：标题 + 摘要 + 站内链接 + 原文链接。正文交给系统浏览器。
- 轮询最快 60 秒一次，再快只拿到同一份缓存。本项目用 10 分钟。
- 单 IP 超约每分钟 60 次会 429。必须遵守 `Retry-After`，不并发重试。

### 5.2 乔木精选（公开只读，无需 Key）

| 用途 | 接口 |
| --- | --- |
| 频道目录 | `GET https://rss.qiaomu.ai/api/sources`（当前 61 个源） |
| 列表 | `GET /api/entries?source=&category=&q=&limit=`（含 `titleZh`） |
| 正文 | `GET /api/entry/:id`（同时返回已有 `rewrite` 与 `readingState.rewrite`） |
| 译文 | `GET /api/entry/:id/translation` |
| 改写 | `GET /api/entry/:id/rewrite` |

约束：

- 状态字段区分 `ready` / `queued` / `processing` / `retrying` / `not_ready` / `unavailable` / `failed`。
  网络失败不等于「没有中文内容」，必须在 UI 上分开显示。
- 这些接口不触发付费生成，可以放心读。
- 服务是个人站点，无 SLA。改版或限流即中断，UI 必须给出可读错误。

### 5.3 个人订阅（本地抓取）

- 支持 RSS 2.0、Atom、OPML 导入导出。
- 单源刷新间隔 15–30 分钟，按源配置；daemon 侧排队，并发不超过 4。
- 请求带 `If-None-Match` / `If-Modified-Since`，避免重复下载。
- 单源保留最新 200 条，全文缓存 100 篇或 30 天，总量上限 100 MB，超出按最旧淘汰。
- 源地址可能含私有 token。**明文存 host settings**，导出 OPML 时提示用户保密。

## 6. 架构

```
iPhone / 桌面 App
   │  RPC（Zod 校验）
   ▼
daemon 插件子进程
   ├─ fetcher：AIHOT、乔木、个人 RSS
   ├─ extractor：正文抽取 → Markdown
   ├─ cache：内存 + 磁盘
   ├─ store：已读/收藏/配置（host settings）
   └─ agent bridge：写给 agent、监听生成结果
```

全部网络请求都在 daemon 侧。客户端只读缓存，不直连三个数据源。

## 7. 文件结构

```
paseo-lantern/
  paseo-plugin.json
  OVERVIEW.md
  package.json
  tsconfig.json
  index.client.tsx
  index.server.ts
  shared/
    contracts.ts      # Zod 契约
    types.ts          # 纯类型
    constants.ts      # 间隔、上限、路径
  server/
    sources/aihot.ts
    sources/qiaomu.ts
    sources/personal.ts
    extract.ts        # HTML → Markdown
    cache.ts
    store.ts
    agent-bridge.ts
  client/
    screen.tsx        # 手机全屏页
    panel.tsx         # 桌面工作区面板
    ListView.tsx
    ArticleView.tsx
    ChannelBar.tsx
    actions.tsx       # 陪读、译文
    settings.tsx
```

## 8. 数据契约

`shared/contracts.ts`：

- `feed.channels`：无入参 → `[{ id, source, title, unread }]`
- `feed.list`：`{ channel, cursor?, limit? }` → `{ items[], nextCursor, total }`
- `feed.article`：`{ source, id }` → `{ title, titleZh?, meta, markdown?, summary, versions, links }`
- `feed.markRead`：`{ source, ids[] }` → `{ unread }`
- `feed.favorite`：`{ source, id, on }` → `{ ok }`
- `feed.refresh`：`{ channel? }` → `{ [channel]: status }`
- `feed.subscriptions`：读/写个人订阅
- `feed.importOpml`：`{ xml }` → `{ added, skipped }`

> 注：手机流式分页可用，但一期用 cursor 分页即可。

## 9. 正文管线

1. 取 HTML（原文链接，或乔木接口给的正文）。
2. `linkedom` 解析 → `@mozilla/readability` 抽正文。
3. `turndown` 转 Markdown，保留标题、列表、代码、引用、图片。
4. 落盘缓存，客户端用宿主 `Markdown` 组件渲染：

```tsx
import { Markdown } from "@getpaseo/plugin/client/ui";
<Markdown>{markdown}</Markdown>
```

约束：

- 抽取失败或正文 < 200 字时，回退为显示摘要 + 「打开原文」。
- 不做 JS 渲染页面的抓取（不引 Puppeteer，装不下）。
- 图片保留 `https` 原始地址，由宿主组件负责显示。

## 10. 界面

### 10.1 手机（主场景）

三层，单列推入，不用抽屉：

1. **频道列表页**：横向频道 chips（AIHOT 精选 / AIHOT 热点 / 乔木精选 / 我的订阅 / 收藏）+ 文章列表。
   - 行：标题最多 2 行，第二行是「来源 · 时间」，未读左侧小圆点。
   - 列表用 `FlatList`（来自 `@getpaseo/plugin/client/ui`），行高 ≥ 64。
   - 下拉刷新 = `feed.refresh`。
2. **文章页**：标题、meta、版本切换（原文 / 译文 / 乔木改写，只有存在的版本可点）、正文 Markdown。
3. **底部固定条（44 高，安全区由宿主处理）**：`陪读` ｜ `原文`。译文放在顶部 chip 行，不占底部。

字号与间距（手机）：

- 标题 20 / 行高 26；正文 16 / 行高 26；meta 12 / 18。
- 左右内边距 16；段落间距 12。
- 触控目标 ≥ 44。无 hover 依赖。

### 10.2 桌面

- 侧边栏脚部一行「资讯」，带未读数，点开全屏页。
- 另有工作区面板「资讯」，可和 agent 左右分屏。同一套组件，宽屏时列表和正文两栏（列表 320）。

### 10.3 空态与错误

- 无网络：显示上次缓存 + 「离线」标记。
- 乔木服务不可用：只禁该频道，AIHOT 与个人订阅照常。
- 429：显示「稍后再试」，按钮禁用 60 秒。

## 11. 陪读

### 11.1 目标 agent

当前工作区里 `lastActivityAt` 最新的 agent。取法：

```ts
const agents = useAgents({ where: (a) => a.workspace.key === workspaceKey, orderBy: ["lastActivityAt", "desc"] });
```

### 11.2 动作（v1 实现说明）

0.15.4 没有 composer 写入接口，`useComposers` 只在 0.16 beta。
所以 v1 是：弹窗预览 + 确认后 `agent.send()` 直接发送。

0.16 正式版后可切成 `insertText` + `focus()`，弹窗保留。

### 11.2 原计划动作

```ts
// 组件内
const [composer] = useComposers({ agentId });
// 或回调内：client.composers({ agentId })
await composer.insertText(promptText);   // 不覆盖用户草稿
await composer.focus();
```

- 用 `insertText` 不用 `setPrompt`，保护已有草稿。
- `focus()` 在手机上会关掉覆盖层、跳到 agent 标签并弹出键盘。
- `focus()` 可能 reject（agent 已归档、15 秒内没上屏）。失败时弹 toast 并给「改用直接发送」的备选。

### 11.3 提示词模板

固定部分：

```
陪我读这篇文章。先讲背景和关键概念，再解释我不懂的地方。
不确定的术语先查证再说；引用原文要标出处；回答用中文。
如果下面的正文不完整，用工具抓链接原文再回答。

标题：{title}
来源：{source}　发布：{publishedAt}
链接：{url}
{summary}

正文：
{markdown 前 1500 字}
```

可改部分：用户在插件设置里维护「额外要求」（默认空）。

### 11.4 三个入口

1. 文章页底部 `陪读` 按钮 —— 主线。
2. Composer pill：在每个 agent 输入栏常驻，插入「上一篇在读的文章」。
3. `@` 附件：`addAttachmentSource` 注册两个源（AIHOT、乔木），
   选文章返回固定文本快照。P2 实现。

## 12. 译文

范围（2026-11-12 定）：不做乔木侧。乔木 9 篇样本里 7 篇自带改写，译文 9/9 返回 `unavailable`。

新范围：AIHOT 两个频道与「我的订阅」里的英文正文。跳件：

1. 条目 `source` 是 `rss` 或 `aihot`（乔木自带译文，走自己的）。
2. 正文是英文：拉丁字母 ≥ 300，且中文字符占（中文 + 拉丁）不到 5%。

两个条件都成立时，正文页顶部出现 `原文 / 译文` 两个 chip。点 `译文`：

1. 服务端立即返回 `working`，后台把正文分段（每段 1600 字）调翻译接口。
2. 客户端每 2 秒查一次 `lantern.translate.status`，chip 显示「翻译 x/n」。
3. 全部段译完，写 `translations/<key>.json`，客户端自动切到译文。
4. 失败时 chip 下方显示错误与 `重试`。

关键点：不经过 agent，不跳会话，不开弹窗。原因是 `agent.send()` 会把人带去会话界面，打断阅读。

接口：DeepSeek `chat/completions`，模型 `deepseek-chat`。key 读 `~/.pi/agent/auth.json` 的 `deepseek.key`，也认 `DEEPSEEK_API_KEY`。

提示词约束：保留 Markdown 结构与链接，术语与人名保留英文原词，不增删内容，只输出译文。不要把「第 x/y 段」写进 user 消息，否则模型会把它当正文输出。

## 13. 存储

- host settings（`scope: "host"`）：订阅列表、频道顺序、已读集合、收藏、额外提示词。
- 磁盘缓存：`%USERPROFILE%\.paseo\data\paseo-lantern\`
  - `articles/<source>-<id>.md`
  - `lists/<channel>.json`
  - `rewrites/`
- 缓存不进 git，也不上传。

## 14. 分期与验收

每期结束跑：

```bash
cd C:\Users\edcccc\.paseo\projects\paseo-lantern
npx tsc --noEmit
"D:\paseo\resources\bin\paseo.cmd" plugin reload paseo-lantern
"D:\paseo\resources\bin\paseo.cmd" plugin logs paseo-lantern
rg -n "document\.|window\.|localStorage|<[a-z]+[ >]|className=|onClick=" client/
```

`rg` 必须 0 命中。`tsc` 必须 0 错误。日志里不得有 `stopping` 循环。

| 期 | 交付 | 完成标准 |
| --- | --- | --- |
| P0 | 工程骨架、侧边栏行、空屏幕、一个 ping RPC | 手机上点进空页不崩，`reload` 后 running |
| P1 | AIHOT + 乔木精选列表，缓存与分页 | 手机看到两个频道的真实条目，断网后仍有缓存 |
| P2 | 文章页、正文抽取、版本切换 | 手机读完一篇长文，不卡顿；抽取失败有回退 |
| P3 | 个人订阅：OPML 导入导出、定时抓取 | 导入一份真实 OPML，24 小时后新条目出现 |
| P4 | 陪读按钮 + composer 写入 + pill | 三种入口都能把文章写进 agent 输入框 |
| P5 | 译文（个人订阅 + AIHOT 的英文文章） | 点一下原地出中文稿，不跳页；乔木侧不做，乔木自带改写 |
| P6a | 已读、收藏、收藏频道（host settings） | 未读圆点、收藏按钮、收藏频道；跨设备跟随 host |
| P6b | 桌面分屏面板 | 桌面工作区能并排开「提灯」与 agent |
| P7 | 打磨：缓存淘汰、错误文案、抓取并发 | 正文缓存 100 篇 / 30 天；四种错误说法统一；订阅并发 5 |

## 15. 手机验收清单（用户执行）

1. 打开 App，侧边栏能看到「资讯」入口。
2. 点进去，AIHOT 精选有条目，不是空白。
3. 切到乔木精选，标题是中文。
4. 点开一篇，正文能读，字号可读，不横向溢出。
5. 长文滚动到底不闪烁、不掉帧。
6. 点「译文」或「乔木改写」，有则显示，无则给出明确提示。
7. 点「陪读」，跳到 agent 页，输入框里有文章上下文，键盘已弹出。
8. 发送后 agent 的回答能针对这篇文章。
9. 点「译文」，原地等几秒能看到中文稿，不跳页。
10. 标记已读后返回列表，未读点消失。
11. 打开飞行模式再进列表，仍能看到缓存。
12. 深色模式下文字不是黑块或白块。

## 16. 风险与红线

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| AIHOT 使用规则：对外商业、公开镜像、批量再分发需书面授权 | 可能不能公开分发 | 只自用；要公开先问授权 |
| 乔木服务是个人站点，无 SLA | 改版即断 | UI 显示可读错误；可选自托管 `qmreader` |
| `qiaomu-rss-dsh` 为 GPL-3.0 | 复制代码会传染许可 | 只照功能重写 |
| 手机依赖主机 | 离开电脑不可用 | 文档写明；不做离线方案 |
| agent 不回写文件 | 中文版生成失败 | 备选：读 agent 回复并落盘（需验证 timeline 读取能力） |
| 自定义 RSS 源反爬 | 部分源抓不到 | 单源失败不影响其他源 |
| 源地址含 token | 泄露 | 明文存本机；导出时提示 |
| 正文抽取依赖 | 包体变大 | 只引 `linkedom` + `readability` + `turndown` |

## 17. 待确认（编码中遇到再问）

1. 桌面面板是否要独立打开命令（Command Center 项）。默认加一个。

已定：插件 id 与项目目录同名 `paseo-lantern`；不读读者社区。

## 18. 未验证项

- iPhone 上 `Markdown` 组件的图片加载与长文性能 —— 要 P2 真机看。
- `focus()` 在 iPhone 上的跳转与键盘弹出 —— 要 P4 真机看。
- agent 写文件方案的成功率 —— 要 P5 实测。
- `%USERPROFILE%\.paseo\data\` 是否被 Paseo 清理 —— 未确认，确认方法：跑 Paseo 更新后再查目录。

## 19. 来源

- Paseo 插件文档：`https://paseo.sh/docs/plugins/reference.md`、`/plugins/sidebar-views.md`、`/docs/sdk/reference.md`
- AIHOT 接口与规则：`https://aihot.news/llms.txt`、`https://aihot.news/terms`
- 乔木接口与许可：`https://github.com/joeseesun/qmreader`（README、MIT）
- DSH 插件功能参照：`https://github.com/joeseesun/qiaomu-rss-dsh`（GPL-3.0）
