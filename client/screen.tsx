import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { openExternalUrl, useRpc, useSettings } from "@getpaseo/plugin/client";
import { FlatList, Icon, useToast } from "@getpaseo/plugin/client/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type ChannelId, type FeedItem, type FeedState, listRpc } from "../shared/feed";
import {
  EMPTY_STATE,
  type LanternState,
  MAX_READ_ENTRIES,
  itemKey,
  lanternStateSettings,
} from "../shared/settings";
import { ArticleView } from "./article";
import { SubsPanel } from "./subs-panel";

/** 频道来自服务端，收藏是本地伪频道：直接用 settings 里的快照渲染 */
type ViewChannel = ChannelId | "star";

const CHIPS: Array<{ id: ViewChannel; title: string; full: string }> = [
  { id: "aihot-selected", title: "精选", full: "AIHOT 精选" },
  { id: "aihot-hot", title: "热点", full: "AIHOT 热点" },
  { id: "qiaomu", title: "乔木", full: "乔木精选" },
  { id: "mine", title: "订阅", full: "我的订阅" },
  { id: "star", title: "收藏", full: "收藏" },
];

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** 今天 → 07:54；昨天 → 昨天 07:54；今年 → 11月13日；往年 → 2024年11月13日 */
function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const stamp = date.getTime();
  if (stamp >= startOfToday) return time;
  if (stamp >= startOfYesterday) return `昨天 ${time}`;
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function stateLabel(state: FeedState): string {
  switch (state) {
    case "live":
      return "更新于";
    case "revalidated":
      return "已是最新";
    case "cached":
      return "缓存";
    case "stale":
      return "离线缓存";
  }
}

export type LanternSurfaceProps = Pick<PluginScreenProps, "theme" | "layout">;

/** 全屏页入口 */
export function LanternScreen({ theme, layout }: PluginScreenProps) {
  return <LanternSurface theme={theme} layout={layout} />;
}

/** 全屏页和工作区分屏面板共用同一个界面 */
export function LanternSurface({ theme, layout }: LanternSurfaceProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const list = useRpc(listRpc);
  const settings = useSettings(lanternStateSettings);
  const [channel, setChannel] = useState<ViewChannel>("aihot-selected");
  const [openItem, setOpenItem] = useState<FeedItem | null>(null);
  const [subsOpen, setSubsOpen] = useState(false);

  const state = settings.status === "ready" ? settings.values : EMPTY_STATE;

  function saveState(patch: Partial<LanternState>): void {
    if (settings.status !== "ready") return;
    void settings
      .save({ ...settings.values, ...patch }, settings.revision)
      // 冲突时重拉一次，下一次操作基于新值
      .then((ok) => (ok ? undefined : settings.reload()));
  }

  function open(item: FeedItem): void {
    setOpenItem(item);
    const key = itemKey(item);
    if (state.read.includes(key)) return;
    saveState({ read: [...state.read, key].slice(-MAX_READ_ENTRIES) });
  }

  const query = useQuery({
    queryKey: ["lantern", channel],
    queryFn: () => list({ channel: channel as ChannelId, limit: 60 }),
    enabled: channel !== "star",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => {
    // 列表在手机上占满宽度，在桌面上是 320 的窄栏，两类都用 16 的内边距
    const horizontal = 16;
    return {
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      wideList: {
        // 380 是五个频道标签一行放得下的最小宽度，再窄「收藏」会掉行
        width: 380,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
      },
      wideBody: {
        flex: 1,
        alignItems: "stretch" as const,
        justifyContent: "center" as const,
      },
      wideEmpty: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, gap: 10 },
      chipBar: {
        flexDirection: "row" as const,
        alignItems: "flex-start" as const,
        paddingHorizontal: horizontal,
        paddingTop: 12,
        paddingBottom: 4,
        gap: 8,
      },
      chipGroup: {
        flex: 1,
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        gap: 6,
      },
      chipActions: { flexDirection: "row" as const, gap: 2 },
      iconButton: {
        width: 36,
        height: 36,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        borderRadius: 18,
      },
      chip: {
        minHeight: layout.compact ? 44 : 36,
        paddingHorizontal: 12,
        justifyContent: "center" as const,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
      },
      chipActive: {
        minHeight: layout.compact ? 44 : 36,
        paddingHorizontal: 12,
        justifyContent: "center" as const,
        borderRadius: 999,
        backgroundColor: theme.colors.accent,
      },
      chipText: { color: theme.colors.foreground, fontSize: 13.5 },
      chipTextActive: { color: theme.colors.accentForeground, fontSize: 13.5 },
      footer: {
        paddingHorizontal: horizontal,
        paddingVertical: 12,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 12,
      },
      footerText: { color: theme.colors.foregroundMuted, fontSize: 11 },
      footerEntry: {
        minHeight: 44,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
        paddingLeft: 8,
      },
      footerEntryText: { color: theme.colors.foregroundMuted, fontSize: 12 },
      row: {
        paddingHorizontal: horizontal,
        paddingVertical: 13,
        flexDirection: "row" as const,
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      },
      // 未读标记占固定一列，标题起点在所有条目上完全一致
      markCol: { width: 7, alignItems: "flex-start" as const },
      rowBody: { flex: 1, gap: 5 },
      unreadDot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        marginTop: 9,
        backgroundColor: theme.colors.accent,
      },
      rowTitle: {
        color: theme.colors.foreground,
        fontSize: layout.compact ? 16 : 17,
        lineHeight: layout.compact ? 24 : 26,
      },
      metaRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
      meta: { color: theme.colors.foregroundMuted, fontSize: 12, lineHeight: 18 },
      state: { padding: 32, alignItems: "center" as const, gap: 10 },
      stateText: { color: theme.colors.foregroundMuted, fontSize: 14, textAlign: "center" as const },
      retry: {
        minHeight: 44,
        paddingHorizontal: 20,
        justifyContent: "center" as const,
        borderRadius: 10,
        backgroundColor: theme.colors.accent,
      },
      retryText: { color: theme.colors.accentForeground, fontSize: 15 },
    };
  }, [theme, layout.compact]);

  async function refresh() {
    if (channel === "star") return;
    setRefreshing(true);
    try {
      const fresh = await list({ channel, limit: 60, force: true });
      queryClient.setQueryData(["lantern", channel], fresh);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刷新失败");
    } finally {
      setRefreshing(false);
    }
  }

  function renderRow(item: FeedItem) {
    const unread = !state.read.includes(itemKey(item));
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        onPress={() => open(item)}
        style={styles.row}
      >
        <View style={styles.markCol}>{unread ? <View style={styles.unreadDot} /> : null}</View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { flexShrink: 1 }]} numberOfLines={1}>
              {item.origin ?? ""}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {formatTime(item.publishedAt)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  const isStarChannel = channel === "star";
  const data = isStarChannel ? state.star : (query.data?.items ?? []);
  const isPending = !isStarChannel && query.isPending;
  const isError = !isStarChannel && query.isError;
  const statusText = isStarChannel
    ? `${state.star.length} 条收藏`
    : query.data
      ? `${stateLabel(query.data.state)} ${formatTime(query.data.fetchedAt)}`
      : "";

  const articlePane = openItem ? (
    <ArticleView
      item={openItem}
      theme={theme}
      layout={layout}
      onBack={() => setOpenItem(null)}
    />
  ) : null;

  const listPane = (
    <View style={styles.screen}>
      <View style={styles.chipBar}>
        <View style={styles.chipGroup}>
          {CHIPS.map((entry) => {
            const active = entry.id === channel;
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityLabel={`频道：${entry.full}`}
                onPress={() => setChannel(entry.id)}
                style={active ? styles.chipActive : styles.chip}
              >
                <Text style={active ? styles.chipTextActive : styles.chipText}>{entry.title}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.chipActions}>
          {isStarChannel ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="刷新"
              disabled={refreshing}
              onPress={() => void refresh()}
              hitSlop={6}
              style={styles.iconButton}
            >
              <Icon
                name="RotateCw"
                size={17}
                color={refreshing ? theme.colors.accent : theme.colors.foregroundMuted}
              />
            </Pressable>
          )}
        </View>
      </View>

      {isPending ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>正在载入</Text>
        </View>
      ) : isError ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>
            {query.error instanceof Error ? query.error.message : "载入失败"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="重试"
            onPress={() => void query.refetch()}
            style={styles.retry}
          >
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => `${item.source}-${item.id}`}
          renderItem={({ item }) => renderRow(item)}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          contentContainerStyle={data.length === 0 ? { flexGrow: 1 } : undefined}
          ListFooterComponent={
            data.length > 0 ? (
              <View style={styles.footer}>
                <Text style={[styles.footerText, { flex: 1 }]} numberOfLines={1}>
                  {statusText}
                </Text>
                {channel === "mine" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="订阅管理"
                    onPress={() => setSubsOpen(true)}
                    style={styles.footerEntry}
                  >
                    <Icon name="Settings" size={15} color={theme.colors.foregroundMuted} />
                    <Text style={styles.footerEntryText}>订阅管理</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.state}>
              <Icon
                name={isStarChannel ? "Star" : channel === "mine" ? "Plus" : "Inbox"}
                size={26}
                color={theme.colors.foregroundMuted}
              />
              <Text style={styles.stateText}>
                {isStarChannel ? "还没有收藏" : channel === "mine" ? "还没有订阅" : "暂无内容"}
              </Text>
            </View>
          }
        />
      )}

      <SubsPanel
        theme={theme}
        layout={layout}
        open={subsOpen}
        onOpenChange={setSubsOpen}
      />
    </View>
  );

  // 桌面：左窄列列表，右侧读正文，选文章不替换整个界面
  if (!layout.compact) {
    return (
      <View style={[styles.screen, { flexDirection: "row" }]}>
        <View style={styles.wideList}>{listPane}</View>
        <View style={styles.wideBody}>
          {articlePane ?? (
            <View style={styles.wideEmpty}>
              <Icon name="Lamp" size={30} color={theme.colors.foregroundMuted} />
              <Text style={styles.stateText}>选一篇文章</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return articlePane ?? listPane;
}
