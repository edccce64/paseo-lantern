# 提灯 · The Lantern

> 在 [Paseo](https://paseo.sh) 里读 AI 资讯。遇到读不懂的文章，一键交给手边的 agent 陪你读。

- 中文名：**提灯**
- 英文名：**The Lantern**
- 插件 id：`paseo-lantern`
- 形态：Paseo 插件。手机上是全屏页，桌面上是可和 agent 并排的工作区面板，共用一套界面
- 目标宿主：Paseo `>= 0.16.1`

> **English**: The Lantern is a Paseo plugin that turns your agent into a reading companion. It reads AI news from AIHOT and the Qiaomu RSS service, renders the full article on a newspaper-style page, translates English posts in place, and hands any article to your most recently active agent when you want a guided read.

---

## 1. 这是什么

信息流太多，读完又常常没读懂。提灯解决两件事：

1. **读得下来**：把 AIHOT 精选、AIHOT 热点、乔木精选、你自己的 RSS 订阅收进一个安静的阅读界面。
2. **读得懂**：点「AI 陪读」，提示词写进最近活跃 agent 的输入框，你还在自己的输入框里改字、加附件，然后自己按发送。

它不生产内容，也不再造一个信息流。它只是把已有的公开源，交给一个已经在你身边的 agent。

---

## 2. 核心功能

**阅读**

- 四个资讯频道：AIHOT 精选、AIHOT 热点、乔木精选、我的订阅，外加一个本地「收藏」频道。
- 正文不是摘要。daemon 会抓原文页并抽取正文；抽取失败时退回摘要。
- 自建 Markdown 渲染器：标题、段落、引用、列表、代码块、图片、管状表格、行内加粗/斜体/代码/链接。
- 报纸式排版：手写体报头、栏目横排、衬线标题、发丝线分隔。适配深色模式。

**陪读与翻译**

- **AI 陪读**：弹窗预览提示词，确认后写进最近活跃 agent（本工作区）的输入框，不自动发。写入后界面会跳到那个 agent 的标签页。
- **译文**：英文正文点一下，服务端直连 DeepSeek 分 6 路并发翻译，原地出中文稿，不跳页、不经过 agent。

**订阅**

- 自己抓 RSS / Atom / RDF，不依赖第三方账号。
- 内置 1342 个中文独立博客目录，按名字、标签或地址搜索后一键订阅。
- OPML 导入导出。
- 后台每 15 分钟刷新一轮。

**本地优先**

- 已读与收藏存 Paseo host settings，跟着 daemon 走。
- 正文、译文、订阅列表全部缓存在本机，总量上限 100 MB，超了按最旧淘汰。
- 没有账号体系，没有服务端，没有埋点。

---

## 3. 与你可能熟悉的几个项目的关系

本项目是**非官方客户端**。它只调用下列项目的公开只读接口，不包含、不打包、不再分发它们的内容与代码。

| 项目 | 关系 | 许可证与说明 |
| --- | --- | --- |
| [AIHOT](https://aihot.news)（AI 资讯精选站） | 提灯读取它的公开只读 API：「精选流」与「热点榜」。文章正文由提灯自己去抓原站页面，不取 AIHOT 的接口。 | 使用规则：自用免费；对外商业使用、公开镜像、批量再分发需先取得 AIHOT 书面授权。其引擎仓库 `KKKKhazix/AIHOT` 为 MIT。 |
| [乔木 / QMReader](https://rss.qiaomu.ai)（乔木的 RSS 与 AI 阅读服务） | 提灯读取它的公开只读 API：源列表、条目列表、单篇正文与乔木改写。 | 乔木的开源实现 `joeseesun/qmreader`、`qmreader-ios`、`qiaomu-ai-rss` 均为 MIT。同作者的 `qiaomu-rss-dsh` 为 GPL-3.0-only，本项目的功能是独立重写，**没有复制该仓库的任何代码**。 |
| [chinese-independent-blogs](https://github.com/timqian/chinese-independent-blogs) | 「发现」页搜索用的 1342 条独立博客目录，由该仓库生成。 | MIT。 |
| [Caveat](https://fonts.google.com/specimen/Caveat) | 报头手写字标 `The Lantern` 用它渲染成图片后内嵌。 | SIL Open Font License 1.1。 |

**边界**：提灯不镜像全文到任何公开位置，只在本机缓存阅读所需的内容。文章的版权归原媒体与作者。如果你要把提灯用于对外商业分发，请先自行取得 AIHOT 的书面授权。

---

## 4. 这个项目没有任何商业意图

写清楚，避免误会：

- 不收费，无内购，无订阅制。
- 无账号系统，无登录，无用户数据上传。
- 无广告，无推广位，无联盟链接。
- 无埋点、无统计、无崩溃上报。
- 没有服务器，没有云端数据库，没有云端同步。
- 仓库里所有数据访问都发生在你自己机器的 daemon 进程里。

这是一个自用工具，公开出来只是觉得可能对别人也有用。

---

## 5. 技术栈与架构

**技术栈**

| 层 | 选型 |
| --- | --- |
| 语言 | TypeScript（`strict`）。只有转 Markdown 的 turndown 规则里，DOM 节点参数用 `any`，其余全部有类型 |
| 客户端 | React 19 + React Native 0.81（Paseo 插件运行时），`@tanstack/react-query` |
| 服务端 | Node（跑在 Paseo daemon 子进程里），`fetch` + `AbortController` |
| 解析 | `fast-xml-parser`（RSS / Atom / RDF / OPML）、`linkedom` + `@mozilla/readability`（正文抽取）、`turndown`（HTML → Markdown，含自写的 GFM 表格规则） |
| 契约 | Zod schema 定义 RPC 入参与返回，客户端与服务端共用同一份 `shared/` |
| 存储 | 普通 JSON 文件 + Paseo host settings |

**数据流**

```
React Native 界面 (client/)
        │  useRpc(listRpc / articleRpc / subsRpc / translateRpc)
        ▼
Zod 契约 (shared/)  ────────────────►  daemon 处理器 (server/)
                                          │
                          ┌───────────────┼────────────────┐
                          ▼               ▼                ▼
                  sources/aihot.ts   sources/qiaomu.ts   mine.ts（自抓 RSS）
                          │               │                │
                          └─────────► 内存 + 磁盘缓存 (cache.ts)
                                          │
                                    100 MB 上限，按最旧淘汰
```

**界面结构**

- `client/screen.tsx`：报头、频道横排、搜索、报纸式列表、桌面右栏「今日速览」、浮动订阅入口。
- `client/article.tsx`：正文视图，含自建 Markdown 解析与渲染、版本切换、译文进度、AI 陪读。
- `client/subs-panel.tsx`：订阅管理两层：已订阅 / 发现。
- `client/sheet.tsx`：主题化弹层，替掉宿主 `Modal`（宿主标题栏颜色不可控）。

---

## 6. 快速开始

### 6.1 前置要求

- **Paseo `>= 0.16.1`**（桌面端或手机端都行，手机端需要连到同一个 daemon）。
- **Node.js `>= 20`**：只有开发和类型检查需要。
- **DeepSeek API Key**：只有「译文」功能需要，可选。

### 6.2 安装

```bash
git clone https://github.com/edccce64/paseo-lantern paseo-lantern
cd paseo-lantern
npm install
```

把插件装进 Paseo：

```bash
# 从本地目录安装
paseo plugin install .

# 或直接从 git 仓库安装
paseo plugin install git:edccce64/paseo-lantern

# 确认状态，应当是 running
paseo plugin ls paseo-lantern
```

`paseo` 命令由 Paseo 桌面端提供。Windows 上如果在 PATH 里找不到，用安装目录下的 `paseo.cmd` 全路径调用。

装好后在 Paseo 侧边栏头部组里会看到「提灯」。桌面端还可以从工作区标签栏的「+」菜单里开一个「提灯」面板，和 agent 左右并排。

### 6.3 配置译文（可选）

译文功能需要 DeepSeek 的 key。二选一：

```bash
# 方式一：环境变量
export DEEPSEEK_API_KEY=sk-...
```

```jsonc
// 方式二：写进 pi agent 的 auth 文件（使用 pi 的用户通常已有）
// ~/.pi/agent/auth.json
{ "deepseek": { "key": "sk-..." } }
```

不配置也能正常阅读，只是「译文」按钮会提示缺 key。

### 6.4 开发常用命令

```bash
npx tsc --noEmit                      # 类型检查，必须 0 错误
paseo plugin reload paseo-lantern     # 改完重载
paseo plugin logs paseo-lantern       # 看 daemon 日志
```

改动 `client/` 之后需要重载插件；重载会关闭已经打开的「提灯」标签页，要重新进入。

### 6.5 数据存在哪里

| 位置 | 内容 |
| --- | --- |
| `~/.paseo/data/paseo-lantern/` | 订阅列表、四个频道的缓存、正文缓存、译文缓存 |
| Paseo host settings，文档 id `lantern-state` | 已读条目、收藏快照 |

缓存总量上限 100 MB，正文缓存最多 100 篇 / 30 天，超限时按最旧优先删除。`subscriptions.json` 不会被删除。

卸载：`paseo plugin remove paseo-lantern`。如果也想清掉缓存，手动删除上面的数据目录。

---

## 7. 项目结构

```
.
├── index.client.tsx        # 注册屏幕、工作区分屏面板、侧边栏行、Command Center 项
├── index.server.ts         # 注册 12 个 RPC 与 host settings，启动后台刷新
├── paseo-plugin.json       # 插件元数据（id、显示名、宿主版本要求）
├── client/                 # 跑在 Paseo 里的界面
│   ├── screen.tsx          # 列表页 + 桌面两栏
│   ├── article.tsx         # 正文页 + 自建 Markdown 渲染
│   ├── subs-panel.tsx      # 订阅管理弹层
│   ├── sheet.tsx           # 主题化弹层
│   ├── style.ts            # 设计令牌（纸色、墨色、橙色、字体、小字排版）
│   ├── wordmark.ts         # 手写体报头的内嵌 PNG（base64）
│   ├── companion.ts        # 陪读提示词拼装
│   ├── panel.tsx           # 工作区分屏面板
│   └── item.tsx            # 侧边栏行
├── server/                 # 跑在 daemon 子进程里
│   ├── feed.ts             # 频道分发
│   ├── article.ts          # 正文与版本
│   ├── mine.ts             # 个人订阅抓取与合并
│   ├── background.ts       # 后台每 15 分钟刷新
│   ├── subs.ts             # 订阅文件读写
│   ├── subs-rpc.ts         # 订阅相关 RPC
│   ├── catalog.ts          # 内置博客目录搜索
│   ├── cache.ts            # 内存 + 磁盘缓存与淘汰
│   ├── translate.ts        # 译文任务与并发
│   ├── translate-store.ts  # 译文缓存
│   ├── errors.ts           # 限流 / 超时 / 断网 / 对方报错的统一文案
│   ├── page-article.ts     # 订阅条目正文抽取
│   ├── qiaomu-article.ts   # 乔木正文与版本
│   ├── ping.ts             # 自检 RPC
│   ├── sources/            # AIHOT、乔木、HTTP 封装
│   ├── feeds/parse.ts      # RSS / Atom / RDF / OPML 解析
│   ├── text/               # Markdown 转换、语言判定、来源名清洗
│   └── data/blog-catalog.ts# 内置 1342 条独立博客目录
├── shared/                 # 客户端与服务端共用的 Zod 契约
└── docs/                   # 规格书、交接记录、界面走查
```

---

## 8. 已知限制

- 陪读只能写进「当前工作区最近活跃的 agent」的输入框，还不能手动挑 agent。
- 乔木的译文接口对多数条目返回 `unavailable`，所以乔木侧的「译文」常常不可点。
- 后台刷新依赖 daemon 常驻。daemon 停了，只有在打开频道时才会懒加载。
- 订阅刷新间隔统一 15 分钟，还不能按源单独配置。
- 手机端键盘弹出时，弹层里的输入框是否被遮挡尚未验证。
- 插件没有发布到 npm，只能用目录或 git 安装。

想做的和做过的细节在 `docs/HANDOFF.md`，需求与接口约定在 `docs/SPEC.md`。

---

## 9. 许可证

本项目代码采用 [MIT](LICENSE)。

第三方内容单独声明：

| 内容 | 许可证 |
| --- | --- |
| 独立博客目录（`server/data/blog-catalog.ts`） | MIT，来自 [timqian/chinese-independent-blogs](https://github.com/timqian/chinese-independent-blogs) |
| 报头字体 Caveat（已渲染为图片内嵌） | SIL Open Font License 1.1 |
| npm 依赖（`turndown`、`fast-xml-parser`、`linkedom`、`@mozilla/readability` 等） | 各自仓库的许可证 |

AIHOT 与乔木的内容版权归各自原作者与媒体，不在本项目的 MIT 授权范围内。

---

## 10. 致谢

- [Paseo](https://paseo.sh)：插件运行时与 agent 通道。
- [AIHOT](https://aihot.news)：AI 资讯的筛选与聚类。
- [乔木 / QMReader](https://rss.qiaomu.ai)：中文 AI 资讯的 RSS 与改写。
- [timqian/chinese-independent-blogs](https://github.com/timqian/chinese-independent-blogs)：独立博客目录。
- [Caveat](https://fonts.google.com/specimen/Caveat)：报头字标。
