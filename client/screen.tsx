import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useRpc, useSettings } from "@getpaseo/plugin/client";
import { FlatList, Icon, Modal, useToast } from "@getpaseo/plugin/client/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, TextInput, View } from "react-native";
import { type ChannelId, type FeedItem, type FeedState, listRpc } from "../shared/feed";
import {
  EMPTY_STATE,
  type LanternState,
  MAX_READ_ENTRIES,
  itemKey,
  lanternStateSettings,
} from "../shared/settings";
import { ArticleView } from "./article";
import { FONT, LABEL, SECTION, palette } from "./style";
import { SubsPanel } from "./subs-panel";

/** 频道来自服务端，收藏是本地伪频道：直接用 settings 里的快照渲染 */
type ViewChannel = ChannelId | "star";

const CHANNELS: Array<{ id: ViewChannel; title: string; full: string }> = [
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

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/** 2026年11月14日 · 星期六 */
function formatToday(now: Date): string {
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${WEEKDAYS[now.getDay()]}`;
}

/** 11月14日 */
function formatTodayShort(now: Date): string {
  return `${now.getMonth() + 1}月${now.getDate()}日`;
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

/** 来源短名：服务端给了 site 就用 site，否则退回 origin */
function sourceName(item: FeedItem): string {
  const site = (item as { site?: string | null }).site ?? null;
  return site ?? item.origin ?? "";
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
  const [keyword, setKeyword] = useState("");
  const [unstarTarget, setUnstarTarget] = useState<FeedItem | null>(null);

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

  function removeStar(item: FeedItem): void {
    const key = itemKey(item);
    saveState({ star: state.star.filter((entry) => itemKey(entry) !== key) });
  }

  const query = useQuery({
    queryKey: ["lantern", channel],
    queryFn: () => list({ channel: channel as ChannelId, limit: 60 }),
    enabled: channel !== "star",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const [refreshing, setRefreshing] = useState(false);

  // 刷新时图标转圈
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!refreshing) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [refreshing, spin]);
  const spinStyle = {
    transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }],
  };

  const colors = useMemo(() => palette(theme), [theme]);

  const styles = useMemo(() => {
    const p = colors;
    const horizontal = 16;
    return {
      screen: { flex: 1, backgroundColor: p.paper },
      wideList: {
        // 380 是五个频道标签一行放得下的最小宽度，再窄「收藏」会掉行
        width: 380,
        borderRightWidth: 1,
        borderRightColor: p.rule,
      },
      wideBody: {
        flex: 1,
        alignItems: "stretch" as const,
        justifyContent: "flex-start" as const,
      },

      // 报头
      masthead: {
        backgroundColor: p.paper,
        paddingHorizontal: horizontal,
        paddingTop: 14,
        paddingBottom: 10,
        alignItems: "center" as const,
      },
      vol: { ...LABEL, color: p.muted, textAlign: "center" as const },
      wordmark: {
        marginTop: 6,
        fontFamily: FONT.serif,
        fontSize: layout.compact ? 28 : 26,
        fontWeight: "700" as const,
        letterSpacing: 6,
        color: p.ink,
        textAlign: "center" as const,
      },
      refreshButton: {
        position: "absolute" as const,
        right: 12,
        bottom: 10,
        minHeight: 32,
        paddingHorizontal: 6,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
      },
      refreshLabel: { fontFamily: FONT.sans, fontSize: 12, color: p.accent },
      // 报头底部的双线：一条 3px 墨线，紧接一条 1px 墨线
      ruleThick: { height: 3, backgroundColor: p.ink },
      ruleThin: { height: 1, backgroundColor: p.ink },

      // 栏目横排
      channelRow: {
        flexDirection: "row" as const,
        backgroundColor: p.paper,
      },
      channelCell: {
        flex: 1,
        alignItems: "center" as const,
        paddingVertical: 10,
        borderRightWidth: 1,
        borderRightColor: p.rule,
      },
      channelText: { ...SECTION, color: p.ink },
      channelTextActive: { ...SECTION, color: p.accent, fontWeight: "700" as const },
      // 选中线单独一行，未选中处保持空白，文字基线不跳
      channelMarks: { flexDirection: "row" as const, height: 3, backgroundColor: p.paper },
      channelMark: { flex: 1 },
      channelMarkActive: { flex: 1, backgroundColor: p.accent },
      channelRule: { height: 1, backgroundColor: p.ink },

      // 搜索
      searchWrap: {
        paddingHorizontal: horizontal,
        paddingVertical: 10,
        backgroundColor: p.paper,
        borderBottomWidth: 1,
        borderBottomColor: p.rule,
      },
      searchRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
      },
      searchInput: {
        flex: 1,
        fontFamily: FONT.sans,
        fontSize: 13.5,
        color: p.ink,
        backgroundColor: p.panel,
        borderWidth: 1,
        borderColor: p.rule,
        borderRadius: 2,
        paddingHorizontal: 10,
        paddingVertical: 7,
      },
      searchClear: {
        minWidth: 28,
        minHeight: 28,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },

      // 列表
      row: {
        paddingHorizontal: horizontal,
        paddingVertical: 14,
        flexDirection: "row" as const,
      },
      // 条目之间的 1px 分隔线，通栏
      separator: {
        height: 1,
        marginHorizontal: horizontal,
        backgroundColor: p.rule,
      },
      // 未读标记占固定一列，标题起点在所有条目上完全一致
      markCol: { width: 10, alignItems: "flex-start" as const },
      unreadMark: { width: 4, height: 4, marginTop: 7, backgroundColor: p.accent },
      rowBody: { flex: 1, gap: 6 },
      leadTitle: {
        fontFamily: FONT.serif,
        fontSize: 26,
        fontWeight: "700" as const,
        lineHeight: 36.4,
        color: p.ink,
      },
      leadTitleRead: { color: p.muted },
      leadSummary: {
        fontFamily: FONT.sans,
        fontSize: 13.5,
        lineHeight: 21,
        color: p.inkSoft,
        marginTop: 4,
      },
      itemTitle: {
        fontFamily: FONT.serif,
        fontSize: 17,
        fontWeight: "700" as const,
        lineHeight: 24.7,
        color: p.ink,
      },
      itemTitleRead: { color: p.muted },
      byline: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        marginTop: 9,
      },
      bylineText: { fontFamily: FONT.mono, fontSize: 11, letterSpacing: 0.6, color: p.muted },
      bylineSource: { fontFamily: FONT.mono, fontSize: 11, letterSpacing: 0.6, color: p.muted, flexShrink: 1 },
      bylineHair: { flex: 1, height: 1, backgroundColor: p.rule },

      // 空态与错误
      state: { padding: 32, alignItems: "center" as const, gap: 10 },
      stateText: { fontFamily: FONT.sans, fontSize: 14, textAlign: "center" as const, color: p.muted },
      retry: {
        minHeight: 44,
        paddingHorizontal: 20,
        justifyContent: "center" as const,
        borderRadius: 2,
        backgroundColor: p.accent,
      },
      retryText: { fontFamily: FONT.sans, fontSize: 15, fontWeight: "700" as const, color: p.paper },

      emptyClear: {
        marginTop: 6,
        minHeight: 32,
        paddingHorizontal: 12,
        justifyContent: "center" as const,
      },
      emptyClearText: { fontFamily: FONT.sans, fontSize: 13, color: p.accent },

      // 取消收藏确认
      dialog: { gap: 12 },
      dialogTitle: { fontFamily: FONT.serif, fontSize: 17, fontWeight: "700" as const, color: p.ink },
      dialogText: { fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 20, color: p.inkSoft },
      dialogActions: { flexDirection: "row" as const, gap: 10, justifyContent: "flex-end" as const, marginTop: 4 },
      dialogCancel: {
        minHeight: 44,
        paddingHorizontal: 18,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: p.rule,
        backgroundColor: "transparent",
      },
      dialogCancelText: { fontFamily: FONT.sans, fontSize: 14, letterSpacing: 1, color: p.ink },
      dialogConfirm: {
        minHeight: 44,
        paddingHorizontal: 18,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: p.accent,
        backgroundColor: p.accent,
      },
      dialogConfirmText: { fontFamily: FONT.sans, fontSize: 14, letterSpacing: 1, fontWeight: "600" as const, color: p.paper },

      // 页脚
      footer: {
        paddingHorizontal: horizontal,
        paddingVertical: 12,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: p.rule,
      },
      footerText: { fontFamily: FONT.mono, fontSize: 11, letterSpacing: 0.6, color: p.muted },
      footerEntry: {
        minHeight: 44,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
        paddingLeft: 8,
      },
      footerEntryText: { fontFamily: FONT.sans, fontSize: 12, color: p.ink },

      // 桌面右栏：今日速览
      brief: {
        paddingHorizontal: 30,
        paddingVertical: 28,
        gap: 14,
      },
      briefTitle: {
        fontFamily: FONT.serif,
        fontSize: 24,
        fontWeight: "700" as const,
        letterSpacing: 3,
        color: p.ink,
      },
      briefDate: { fontFamily: FONT.serif, fontSize: 15, color: p.accent },
      briefChannel: { fontFamily: FONT.serif, fontSize: 18, color: p.ink },
      briefCount: { fontFamily: FONT.serif, fontSize: 14, color: p.muted },
      briefCountNum: { fontFamily: FONT.serif, fontSize: 30, fontWeight: "700" as const, color: p.accent },
      briefLatest: {
        fontFamily: FONT.serif,
        fontSize: 17,
        lineHeight: 25,
        color: p.ink,
        marginTop: 4,
      },
      briefMeta: { fontFamily: FONT.serif, fontSize: 13, color: p.muted },
      briefActions: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginTop: 6 },
      briefAction: {
        minHeight: 40,
        paddingHorizontal: 14,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
        borderWidth: 1,
        borderColor: p.ink,
      },
      briefActionText: { fontFamily: FONT.serif, fontSize: 13, color: p.ink },
    };
  }, [colors, layout.compact]);

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

  const isStarChannel = channel === "star";
  const rawData = useMemo(
    () => (isStarChannel ? state.star : (query.data?.items ?? [])),
    [isStarChannel, state.star, query.data?.items],
  );

  // 搜索只过滤当前频道，不动已读与收藏
  const data = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return rawData;
    return rawData.filter((item) => {
      return (
        item.title.toLowerCase().includes(key) ||
        sourceName(item).toLowerCase().includes(key) ||
        (item.origin ?? "").toLowerCase().includes(key)
      );
    });
  }, [rawData, keyword]);

  const isPending = !isStarChannel && query.isPending;
  const isError = !isStarChannel && query.isError;
  const statusText = isStarChannel
    ? `${state.star.length} 条收藏`
    : query.data
      ? `${stateLabel(query.data.state)} ${formatTime(query.data.fetchedAt)}`
      : "";

  const channelMeta = CHANNELS.find((entry) => entry.id === channel);
  const today = useMemo(() => new Date(), []);

  function renderByline(item: FeedItem) {
    const source = sourceName(item);
    return (
      <View style={styles.byline}>
        {source ? (
          <>
            <Text style={styles.bylineSource} numberOfLines={1}>
              {source}
            </Text>
            <View style={styles.bylineHair} />
          </>
        ) : null}
        <Text style={styles.bylineText} numberOfLines={1}>
          {formatTime(item.publishedAt)}
        </Text>
      </View>
    );
  }

  function renderRow(item: FeedItem, isLead: boolean) {
    const unread = !state.read.includes(itemKey(item));
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        onPress={() => open(item)}
        onLongPress={isStarChannel ? () => setUnstarTarget(item) : undefined}
        style={styles.row}
      >
        <View style={styles.markCol}>{unread ? <View style={styles.unreadMark} /> : null}</View>
        <View style={styles.rowBody}>
          <Text
            style={[
              isLead ? styles.leadTitle : styles.itemTitle,
              unread ? null : isLead ? styles.leadTitleRead : styles.itemTitleRead,
            ]}
            numberOfLines={isLead ? 3 : 2}
          >
            {item.title}
          </Text>
          {isLead && item.summary ? (
            <Text style={styles.leadSummary} numberOfLines={2}>
              {item.summary}
            </Text>
          ) : null}
          {renderByline(item)}
        </View>
      </Pressable>
    );
  }

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
      <View style={styles.masthead}>
        <Text style={styles.vol}>
          {layout.compact
            ? `${formatTodayShort(today)} · ${rawData.length} 条`
            : `${formatToday(today)} · 今日 ${rawData.length} 条`}
        </Text>
        <Text style={styles.wordmark}>提灯日报</Text>
        {isStarChannel ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="刷新"
            disabled={refreshing}
            onPress={() => void refresh()}
            hitSlop={6}
            style={styles.refreshButton}
          >
            <Animated.View style={spinStyle}>
              <Icon
                name="RotateCw"
                size={17}
                color={refreshing ? colors.accent : colors.muted}
              />
            </Animated.View>
            {refreshing ? <Text style={styles.refreshLabel}>刷新中</Text> : null}
          </Pressable>
        )}
      </View>
      <View style={styles.ruleThick} />
      <View style={styles.ruleThin} />

      <View style={styles.channelRow}>
        {CHANNELS.map((entry, index) => {
          const active = entry.id === channel;
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`频道：${entry.full}`}
              onPress={() => setChannel(entry.id)}
              style={[
                styles.channelCell,
                { borderRightWidth: index === CHANNELS.length - 1 ? 0 : 1 },
              ]}
            >
              <Text style={active ? styles.channelTextActive : styles.channelText}>
                {entry.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.channelMarks}>
        {CHANNELS.map((entry) => (
          <View
            key={entry.id}
            style={entry.id === channel ? styles.channelMarkActive : styles.channelMark}
          />
        ))}
      </View>
      <View style={styles.channelRule} />

      {rawData.length > 0 ? (
        <View style={styles.searchWrap}>
          <View style={styles.searchRow}>
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder="搜标题或来源"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              returnKeyType="search"
              accessibilityLabel="搜索"
            />
            {keyword.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="清空搜索"
                onPress={() => setKeyword("")}
                hitSlop={6}
                style={styles.searchClear}
              >
                <Icon name="X" size={15} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

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
          renderItem={({ item, index }) => renderRow(item, index === 0)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshing={isStarChannel ? false : refreshing}
          onRefresh={isStarChannel ? undefined : () => void refresh()}
          contentContainerStyle={data.length === 0 ? { flexGrow: 1 } : undefined}
          ListFooterComponent={
            rawData.length > 0 ? (
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
                    <Icon name="Settings" size={15} color={colors.ink} />
                    <Text style={styles.footerEntryText}>订阅管理</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.state}>
              {rawData.length > 0 ? (
                <>
                  <Text style={styles.stateText}>没有匹配的内容</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="清空搜索"
                    onPress={() => setKeyword("")}
                    style={styles.emptyClear}
                  >
                    <Text style={styles.emptyClearText}>清空搜索</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Icon
                    name={isStarChannel ? "Star" : channel === "mine" ? "Plus" : "Inbox"}
                    size={26}
                    color={colors.muted}
                  />
                  <Text style={styles.stateText}>
                    {isStarChannel ? "还没有收藏" : channel === "mine" ? "还没有订阅" : "暂无内容"}
                  </Text>
                </>
              )}
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

      <Modal
        title="取消收藏"
        open={unstarTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnstarTarget(null);
        }}
      >
        <Modal.Content contentContainerStyle={{ padding: 16 }}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>从收藏里移除这条？</Text>
            <Text style={styles.dialogText} numberOfLines={2}>
              {unstarTarget?.title ?? ""}
            </Text>
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="保留收藏"
                onPress={() => setUnstarTarget(null)}
                style={styles.dialogCancel}
              >
                <Text style={styles.dialogCancelText}>取消</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="确认移除收藏"
                onPress={() => {
                  if (unstarTarget) removeStar(unstarTarget);
                  setUnstarTarget(null);
                }}
                style={styles.dialogConfirm}
              >
                <Text style={styles.dialogConfirmText}>移除</Text>
              </Pressable>
            </View>
          </View>
        </Modal.Content>
      </Modal>
    </View>
  );

  // 桌面：左窄列列表，右侧读正文，选文章不替换整个界面
  if (!layout.compact) {
    // 速览看的是整个频道，不受搜索影响
    const latest = rawData[0] ?? null;
    return (
      <View style={[styles.screen, { flexDirection: "row" }]}>
        <View style={styles.wideList}>{listPane}</View>
        <View style={styles.wideBody}>
          {articlePane ?? (
            <View style={styles.brief}>
              <Text style={styles.briefTitle}>今日速览</Text>
              <Text style={styles.briefDate}>今天 {formatTodayShort(today)}</Text>
              <Text style={styles.briefChannel}>{channelMeta?.full ?? ""}</Text>
              <Text style={styles.briefCount}>
                <Text style={styles.briefCountNum}>{rawData.length}</Text> 条内容
              </Text>
              {latest ? (
                <>
                  <Text style={styles.briefLatest} numberOfLines={2}>
                    {latest.title}
                  </Text>
                  <Text style={styles.briefMeta}>
                    {sourceName(latest)} · {formatTime(latest.publishedAt)}
                  </Text>
                </>
              ) : null}
              <View style={styles.briefActions}>
                {isStarChannel ? null : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="刷新"
                    onPress={() => void refresh()}
                    style={styles.briefAction}
                  >
                    <Icon name="RotateCw" size={15} color={colors.ink} />
                    <Text style={styles.briefActionText}>刷新</Text>
                  </Pressable>
                )}
                {channel === "mine" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="订阅管理"
                    onPress={() => setSubsOpen(true)}
                    style={styles.briefAction}
                  >
                    <Icon name="Settings" size={15} color={colors.ink} />
                    <Text style={styles.briefActionText}>订阅管理</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  return articlePane ?? listPane;
}
