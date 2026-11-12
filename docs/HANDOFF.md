# HANDOFF · paseo-lantern（提灯）

最后更新：2026-11-12 16:30

## 当前位置

**P0 已完成。** 工程骨架、侧边栏入口、空页面、`lantern.ping` 自检都已在桌面端跑通。
下一步是 P1：接 AIHOT 与乔木精选的列表。

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

## 已完成

| 文件 | 作用 |
| --- | --- |
| `paseo-plugin.json` | id `paseo-lantern`，显示名「提灯」，`requirements.paseo >=0.15.4` |
| `index.client.tsx` | 注册屏幕 `lantern` 与侧边栏头部行（`addSidebarHeaderItem`，排在 Idealoft 下方） |
| `client/screen.tsx` | 空态页：标题、一行说明、刷新按钮 |
| `client/item.tsx` | 侧边栏行，Lucide 图标 `Lamp` |
| `index.server.ts` | 注册 `lantern.ping` |
| `shared/ping.ts` | Zod 契约 |
| `server/ping.ts` | 返回 daemon 时间与插件版本 |

## 验证记录

- 已验证：`npx tsc --noEmit` → 退出码 0，无输出。
- 已验证：`plugin install` → 状态 `running`、`enabled yes`、无 error。
- 已验证：`plugin logs` 只有 `Loading plugin` / `Plugin ready`，无 stopping 循环。
- 已验证：桌面侧边栏脚部出现「提灯」行（截图 2026-11-12 16:25）。
- 已验证：点该行打开页面，标题「提灯」，显示空态，未崩（截图 16:26）。
- 已验证：点「刷新」后插件日志出现 `[lantern] ping at 2026-11-12T08:26:24.236Z`，说明按钮 → RPC → daemon 子进程链路通。
- 未验证：iPhone 上的渲染与手感（用户真机验收）。
- 未验证：成功 toast「已连接」是否弹出。两次截图都没抓到，可能是时间窗错过，也可能是屏幕表面不显示 toast。

## 已知遗留

1. 脚手架留了 4 个模板文件，现在没人引用：
   - `client/greeting.tsx`、`client/web.ts`、`server/greeting.ts`、`shared/greeting.ts`
   - 删除需要用户同意（红线）。`client/web.ts` 是唯一带 `window.open` 的文件，审计脚本会命中它。
   - P2 会用官方 `openExternalUrl` 打开原文，`web.ts` 届时确定弃用。
2. `server/ping.ts` 保留了一行 `console.log`。只在用户点刷新时打印，用于从手机侧排查「点了没反应」。
3. 屏幕表面上的 toast 是否显示未确认。

## P1 计划

1. `shared/feed.ts`：`feed.channels`、`feed.list` 契约。
2. `server/sources/aihot.ts`：`/api/v1/items` 与 `/api/v1/hot-topics`，带 ETag 与 10 分钟缓存。
3. `server/sources/qiaomu.ts`：`/api/sources` 与 `/api/entries`。
4. `client/screen.tsx`：横向频道 chips + `FlatList` 列表，手机优先。
5. 验收：手机看到两个频道的真实条目；断网仍有缓存。
