# 方案：提灯接入 GitHub 收藏的项目

日期：2026-11-18。状态：**方案，未开工**。结论取决于用户选哪条路，见第 6 节。

---

## 1. 结论先说

可以做，而且不需要 GitHub token。

- 你的收藏（stars）是公开的：`GET https://api.github.com/users/edccce64/starred` 匿名可读，实测返回 94 条、一次请求取完。
- 正文用仓库的 README：`https://raw.githubusercontent.com/<owner>/<repo>/HEAD/README.md`，实测 200，且不占 GitHub API 额度。
- 推荐做成第五个频道「GitHub 收藏」：列表看收藏的项目，点开看 README，陪读 / 已读 / 收藏全部沿用现有能力。

---

## 2. 三条可选路线

| # | 路线 | 用户看到什么 | 代价 | 适合 |
| --- | --- | --- | --- | --- |
| A（推荐） | 第五个频道「GitHub 收藏」 | 收藏的项目列表 + 点开读 README | 频道栏多一个 chip，手机上可能换行成两排 | 想按时间读一遍收藏的好项目 |
| B | 并在「我的订阅」里，做成特殊源 | 每条 star 混进文章流 | 订阅页要能识别 GitHub 源；新旧内容混排，不好找 | 只想顺手刷到，不想多一个频道 |
| C | 只看收藏项目的动态（releases / commits） | 项目更新提醒 | 需要另写动态抓取，README 反而不读 | 想把收藏当监控清单 |

差异一句话：A 是「读」，B 是「混在资讯里」，C 是「盯更新」。

---

## 3. 路线 A 的具体做法

### 3.1 数据（`server/sources/github.ts`，新增）

```
GET https://api.github.com/users/{login}/starred?per_page=100&page=N&sort=created
Header: Accept: application/vnd.github+json
```

- 每条转成现有 `FeedItem`：
  - `id`：`github:<full_name>`
  - `source`：新增枚举值 `"github"`
  - `title`：`<full_name>`，例如 `joeseesun/subcast`
  - `origin`：`<语言> · ★<star 数>`，例如 `TypeScript · ★11.2k`
  - `summary`：仓库 description
  - `url`：`html_url`
  - `publishedAt`：`pushed_at`（最近提交时间）
  - `badge`：可选，最近 7 天有提交显示「本周更新」
- 缓存：列表 30 分钟（沿用 `server/cache.ts`），分页取到取完为止（94 条 = 1 页）。
- 匿名限额：60 次/小时/IP。按 30 分钟刷新一次算，2 次/小时，安全。
- 可选增强：若 daemon 环境有 `GH_TOKEN`，改用 `GET /user/starred`，能拿到 `starred_at`，排序可按「最近收藏」。

### 3.2 正文（`server/github-article.ts`，新增）

1. 依次试 `raw.githubusercontent.com/<owner>/<repo>/HEAD/` + `README.md`、`readme.md`、`README`、`README.markdown`。
2. 全 404 时退回 GitHub API `/repos/<owner>/<repo>/readme`（`Accept: application/vnd.github.raw`），可覆盖大小写异常与特殊分支。
3. 再失败：显示仓库 description + 「这个仓库没有 README」。
4. 链接改写（关键）：README 里的相对图片与相对链接要改成绝对地址，否则徽章、截图全挂。
   - `![x](docs/a.png)` → `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/docs/a.png`
   - 相对链接同理换成 `https://github.com/<owner>/<repo>/blob/HEAD/...`
5. 缓存：按 `<owner>/<repo>` 存 24 小时（README 变更不频繁；不按 commit 失效，省一次请求）。

### 3.3 界面

- `shared/feed.ts`：`CHANNELS` 加 `{ id: "github-stars", title: "GitHub 收藏" }`；`channelIdSchema` 与 `feedItemSchema.source` 加对应值（旧数据缺字段仍按缺省处理）。
- `server/feed.ts`：加一路分发。
- `client/screen.tsx`：频道 chip 自动多一个（现在是 wrap 布局，第 5 个会换行，需截图确认）。
- `client/article.tsx`：`channelName()` 认新 source；缓存字段 `isQiaomu / isRss / isAihot` 要补一个 `isGithub`，并决定要不要给英文 README 开「译文」chip。
- 已读、收藏、陪读、搜索：全部不动，`FeedItem` 通用。

### 3.4 工作量

| 文件 | 改动 |
| --- | --- |
| `server/sources/github.ts` | 新增，约 90 行 |
| `server/github-article.ts` | 新增，约 110 行（含链接改写） |
| `shared/feed.ts` | 约 6 行 |
| `server/feed.ts` | 约 10 行 |
| `client/article.tsx` | 约 15 行 |
| `client/screen.tsx` | 0～10 行（chip 自动出现） |

半天内能跑通，验证按第 5 节。

---

## 4. 已知限制与风险

- 只看得到公开收藏。私有仓库的 star、以及你隐藏的收藏不会出现。
- 匿名访问按 IP 限 60 次/小时。如果同一出口 IP 上还有别的程序在打 GitHub API，可能撞限额；撞了就退回缓存并显示「离线缓存」。
- README 是给人看的工程文档，不是资讯。图片多、徽章多，排版会比文章乱。
- 归档仓库、空仓库、monorepo 的 README 常常只有几十行或指向子目录。
- 收藏的仓库数量会变；列表每次刷新以 GitHub 为准，已读记录按 `github:<full_name>` 保留，repo 改名后已读会丢。
- 星标数是快照，不做实时更新。

---

## 5. 验证清单（开工后逐条过）

1. `npx tsc --noEmit` 退出码 0。
2. `paseo plugin reload paseo-lantern`，状态 `running`。
3. 频道栏出现「GitHub 收藏」，手机上不挤爆（截图确认换行）。
4. 列表条数 = 94，与 `gh api /users/edccce64/starred --jq length` 一致。
5. 点开 3 个不同类型的仓库（纯代码库、有大量图片的库、没有 README 的库），确认：正文能出、图片能显示、无 README 时有提示。
6. 已读圆点、收藏、搜索、AI 陪读各点一次。
7. 断网或 GitHub 返回 429 时，显示「离线缓存」而不是空白。

---

## 6. 待确认

1. 走哪条路线：A 第五个频道（推荐）/ B 混进订阅 / C 只看动态。
2. 正文要不要默认翻译成中文：保留英文原文 / 默认译文（多一次 DeepSeek 调用）。
3. 排序：按最近提交（推荐，能先看到活跃项目）/ 按最近收藏（需要 `GH_TOKEN`）。
4. 频道名：`GitHub 收藏` / `Starred` / 其他。
