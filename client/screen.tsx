import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { openExternalUrl, useRpc } from "@getpaseo/plugin/client";
import { FlatList, useToast } from "@getpaseo/plugin/client/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CHANNELS, type ChannelId, type FeedItem, type FeedState, listRpc } from "../shared/feed";
import { ArticleView } from "./article";
import { SubsPanel } from "./subs-panel";

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
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

export function LanternScreen({ theme, layout }: PluginScreenProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const list = useRpc(listRpc);
  const [channel, setChannel] = useState<ChannelId>("aihot-selected");
  const [openItem, setOpenItem] = useState<FeedItem | null>(null);
  const [subsOpen, setSubsOpen] = useState(false);

  const query = useQuery({
    queryKey: ["lantern", channel],
    queryFn: () => list({ channel, limit: 60 }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => {
    const horizontal = layout.compact ? 16 : 24;
    return {
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      chipBar: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        paddingHorizontal: horizontal,
        paddingVertical: 12,
        gap: 8,
      },
      chip: {
        minHeight: 44,
        paddingHorizontal: 14,
        justifyContent: "center" as const,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
      },
      chipActive: {
        minHeight: 44,
        paddingHorizontal: 14,
        justifyContent: "center" as const,
        borderRadius: 999,
        backgroundColor: theme.colors.accent,
      },
      chipText: { color: theme.colors.foreground, fontSize: 14 },
      chipTextActive: { color: theme.colors.accentForeground, fontSize: 14 },
      statusRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingHorizontal: horizontal,
        paddingBottom: 8,
      },
      status: { color: theme.colors.foregroundMuted, fontSize: 12 },
      refresh: { minHeight: 44, justifyContent: "center" as const, paddingHorizontal: 4 },
      refreshText: { color: theme.colors.accent, fontSize: 13 },
      row: {
        paddingHorizontal: horizontal,
        paddingVertical: 14,
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      },
      rowTitle: {
        color: theme.colors.foreground,
        fontSize: layout.compact ? 16 : 17,
        lineHeight: layout.compact ? 24 : 26,
      },
      metaRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6 },
      meta: { color: theme.colors.foregroundMuted, fontSize: 12, lineHeight: 18 },
      state: { padding: 32, alignItems: "center" as const, gap: 12 },
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
    const meta = [item.origin, item.badge, formatTime(item.publishedAt)].filter(
      (part): part is string => Boolean(part),
    );
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        onPress={() => setOpenItem(item)}
        style={styles.row}
      >
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          {meta.map((part, index) => (
            <Text key={`${part}-${index}`} style={styles.meta} numberOfLines={1}>
              {index > 0 ? "· " : ""}
              {part}
            </Text>
          ))}
        </View>
      </Pressable>
    );
  }

  const data = query.data?.items ?? [];
  const statusText = query.data
    ? `${stateLabel(query.data.state)} ${formatTime(query.data.fetchedAt)}`
    : "";

  if (openItem) {
    return (
      <ArticleView
        item={openItem}
        theme={theme}
        layout={layout}
        onBack={() => setOpenItem(null)}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.chipBar}>
        {CHANNELS.map((entry) => {
          const active = entry.id === channel;
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`频道：${entry.title}`}
              onPress={() => setChannel(entry.id)}
              style={active ? styles.chipActive : styles.chip}
            >
              <Text style={active ? styles.chipTextActive : styles.chipText}>{entry.title}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.status}>{statusText}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          {channel === "mine" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="订阅管理"
              onPress={() => setSubsOpen(true)}
              style={styles.refresh}
            >
              <Text style={styles.refreshText}>订阅管理</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="刷新"
            disabled={refreshing}
            onPress={() => void refresh()}
            style={styles.refresh}
          >
            <Text style={styles.refreshText}>{refreshing ? "刷新中" : "刷新"}</Text>
          </Pressable>
        </View>
      </View>

      {query.isPending ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>正在载入</Text>
        </View>
      ) : query.isError ? (
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
          ListEmptyComponent={
            <View style={styles.state}>
              <Text style={styles.stateText}>
                {channel === "mine" ? "还没有订阅，点右上角「订阅管理」加一个。" : "这个频道还没有内容"}
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
}
