# HANDOFF · paseo-lantern（提灯）

最后更新：2026-11-12 16:50

## 当前位置

**P1 已完成。** 三个频道都能拉到真实数据，带磁盘缓存与条件请求。
下一步是 P2：文章详情页（乔木正文抽取 + 版本切换）。

规格见 `docs/SPEC.md`。

## 目录与命令

```bash
cd C:\Users\edcccc\.paseo\projects\paseo-lantern
npx tsc --noEmit
"D:\paseo\resources\bin\paseo.cmd" plugin reload paseo-lantern
"D:\paseo\resources\bin\paseo.cmd" plugin logs paseo-lantern
"D:\paseo\resources\bin\paseo.cmd" plugin ls paseo-lantern
```

`paseo` 不在 PATH，必须写全路径。

## 文件

| 文件 | 作用 |
| --- | --- |
| `paseo-plugin.json` | id `paseo-lantern`，显示名「提灯」，`requirements.paseo >=0.15.4` |
| `index.client.tsx` | 注册屏幕 `lantern` 与侧边栏头部行（排在 Idealoft 下方） |
| `index.server.ts` | 注册 `lantern.ping` 与 `lantern.list` |
| `client/screen.tsx` | 频道 chips + 状态行 + `FlatList` 列表，手机优先 |
| `client/item.tsx` | 侧边栏行，图标 `Lamp` |
| `shared/feed.ts` | 频道常量、条目 schema、`lantern.list` 契约、四种取数状态 |
| `shared/ping.ts` | 自检契约 |
| `server/feed.ts` | 按频道分发 |
| `server/cache.ts` | 内存 + 磁盘缓存（`%USERPROFILE%\.paseo\data\paseo-lantern\`） |
| `server/sources/http.ts` | 15 秒超时、ETag、429 处理 |
| `server/sources/aihot.ts` | `/api/v1/items`、`/api/v1/hot-topics` |
| `server/sources/qiaomu.ts` | `/api/entries`，`/api/sources` 映射来源名（6 小时缓存） |
| `server/ping.ts` | 返回 daemon 时间 |

## 取数规则

- 缓存有效期 10 分钟。期内不发请求，状态 `cached`。
- 过期后带 `if-none-match` 请求。返回 304 → `revalidated`，内容不变。
- 返回 200 → `live`，写盘。
- 请求失败但有旧缓存 → `stale`，界面显示「离线缓存」。
- 没有旧缓存又失败 → 抛错，界面给「重试」。
- 429 会读 `retry-after`，把秒数写进错误文案。

## 验证记录（P1）

- 已验证：`npx tsc --noEmit` 退出码 0。
- 已验证：`rg` 审计（`document.|window.|<tag|className=|onClick=`）0 命中。
- 已验证：AIHOT 精选显示真实条目，标题 + 来源 + 「精选」+ 时间。
- 已验证：AIHOT 热点显示 Top 10，带「N 家信源」。
- 已验证：乔木精选显示中文标题与来源名（Product Hunt、Latent Space 等）。
- 已验证：点「刷新」走 304 路径，状态行变「已是最新 16:47」。
- 已验证：缓存文件落盘 `aihot-selected.json`、`aihot-hot.json`、`qiaomu.json`、`qiaomu-sources.json`。
- 未验证：真正断网时的 `stale` 分支（没断网测）。
- 未验证：iPhone 上的显示与手感。

## 踩过的坑

- 横向 `ScrollView` 做频道条时，第二次切换后整条会消失（高度塌成 0）。改成 `View` + `flexWrap` 后稳定。三个 chip 在 375 宽的手机上正好一行放下。
- 状态文案最初只有「缓存 / 更新于」两档，304 被显示成「缓存」，容易误读成没刷新。现在分四档。

## P2 计划

1. 文章详情页：标题、meta、版本切换（原文 / 译文 / 乔木改写）。
2. 正文抽取：`linkedom` + `@mozilla/readability` + `turndown`，落盘 Markdown。
3. 用宿主 `Markdown` 组件渲染正文。
4. 底部条：`陪读`（先只写进 agent 输入框）、`原文`。
5. AIHOT 条目只有摘要，不给正文。
