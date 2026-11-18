import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useRpc, useSettings } from "@getpaseo/plugin/client";
import { FlatList, Icon, useToast } from "@getpaseo/plugin/client/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { type ChannelId, type FeedItem, type FeedState, listRpc } from "../shared/feed";
import {
  EMPTY_STATE,
  type LanternState,
  MAX_READ_ENTRIES,
  itemKey,
  lanternStateSettings,
} from "../shared/settings";
import { ArticleView } from "./article";
import { FONT, LABEL, SECTION, isDark, palette } from "./style";
import { WORDMARK_CREAM, WORDMARK_INK, WORDMARK_RATIO } from "./wordmark";
import { SubsPanel } from "./subs-panel";
import { LanternSheet } from "./sheet";

/** 频道来自服务端。收藏是本地伪频道：直接用 settings 里的快照渲染，不占一个标签 */
type ViewChannel = ChannelId;

const CHANNELS: Array<{ id: ViewChannel; title: string; full: string }> = [
  { id: "aihot-selected", title: "精选", full: "AIHOT 精选" },
  { id: "aihot-hot", title: "热点", full: "AIHOT 热点" },
  { id: "qiaomu", title: "乔木", full: "乔木精选" },
  { id: "mine", title: "订阅", full: "我的订阅" },
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

/** 来源短名：服务端给了 site 就用 site，否则退回 origin */
function sourceName(item: FeedItem): string {
  // 仓库的 origin 是「语言 · ★星数」，比 owner 名有用
  if (item.source === "github") return item.origin;
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
  /** 订阅频道里看收藏：收藏不占标签，从订阅列表进，从收藏列表回 */
  const [showStar, setShowStar] = useState(false);
  /** 收藏页的两个分类：本地星标文章 / GitHub 收藏的仓库 */
  const [starTab, setStarTab] = useState<"articles" | "github">("articles");
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
    // 桌面：右栏正在看订阅管理时，选文章就切回正文
    setSubsOpen(false);
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
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  /** 收藏页的 GitHub 分类：只在真的切到那一栏时才联网 */
  const starGithub = showStar && starTab === "github";
  const githubQuery = useQuery({
    queryKey: ["lantern", "github-stars"],
    queryFn: () => list({ channel: "github-stars", limit: 100 }),
    enabled: starGithub,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const [refreshing, setRefreshing] = useState(false);

  const colors = useMemo(() => palette(theme), [theme]);
  const wordmark = isDark(theme) ? WORDMARK_CREAM : WORDMARK_INK;

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
        // 上多留一截让字标往下坐，上下都对呼吸感
        paddingTop: 38,
        paddingBottom: 34,
        alignItems: "center" as const,
      },
      wordmarkImage: {
        // 手写体字标：手机与桌面同样大，占满可用宽度的大半
        width: layout.compact ? 322 : 338,
        aspectRatio: WORDMARK_RATIO,
        alignSelf: "center" as const,
      },

      // 栏目横排：不加竖分隔线，只靠留白与选中色区分
      channelRow: {
        flexDirection: "row" as const,
        backgroundColor: p.paper,
        paddingTop: 2,
      },
      channelCell: {
        flex: 1,
        alignItems: "center" as const,
        paddingVertical: 10,
      },
      channelText: { ...SECTION, color: p.ink },
      channelTextActive: { ...SECTION, color: p.accent, fontWeight: "700" as const },
      // 选中线单独一行，未选中处保持空白，文字基线不跳
      channelMarks: { flexDirection: "row" as const, height: 3, backgroundColor: p.paper },
      channelMark: { flex: 1 },
      channelMarkActive: { flex: 1, backgroundColor: p.accent },
      channelSpacer: { height: 8, backgroundColor: p.paper },

      // 收藏页的分类切换
      starTabs: {
        flexDirection: "row" as const,
        gap: 22,
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 12,
        backgroundColor: p.paper,
      },
      starTab: { paddingVertical: 4 },
      starTabSpacer: { flex: 1 },
      starRefresh: {
        width: 28,
        height: 28,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        alignSelf: "center" as const,
      },
      starTabActive: { borderBottomWidth: 2, borderBottomColor: p.accent },
      starTabText: { ...LABEL, color: p.muted },
      starTabTextActive: { ...LABEL, color: p.accent },

      // 搜索
      searchWrap: {
        paddingHorizontal: horizontal,
        paddingVertical: 10,
        backgroundColor: p.paper,
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
        fontSize: 24,
        fontWeight: "600" as const,
        lineHeight: 33.6,
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
        fontWeight: "600" as const,
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
      bylineSep: { fontFamily: FONT.mono, fontSize: 11, color: p.muted, opacity: 0.6 },

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
      retryText: { fontFamily: FONT.sans, fontSize: 15, fontWeight: "700" as const, color: p.onAccent },

      emptyClear: {
        marginTop: 6,
        minHeight: 32,
        paddingHorizontal: 12,
        justifyContent: "center" as const,
      },
      emptyClearText: { fontFamily: FONT.sans, fontSize: 13, color: p.accent },

      // 取消收藏确认
      dialog: { gap: 12 },
      dialogTitle: { fontFamily: FONT.serif, fontSize: 17, fontWeight: "600" as const, color: p.ink },
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
      dialogConfirmText: { fontFamily: FONT.sans, fontSize: 14, letterSpacing: 1, fontWeight: "600" as const, color: p.onAccent },

      // 页脚
      footer: {
        paddingHorizontal: horizontal,
        paddingVertical: 12,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 12,
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
      // 右下角：收藏与订阅设置两个按钮横排
      fabStack: {
        position: "absolute" as const,
        right: 18,
        bottom: 22,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
      },
      fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: p.accent,
      },
      // 当前就在收藏里时，收藏按钮改成描边样式
      fabQuiet: {
        backgroundColor: p.panel,
        borderWidth: 1,
        borderColor: p.accent,
      },

      // 桌面右栏：今日速览。B 版：全部水平居中，内容块在栏内垂直居中
      brief: {
        flex: 1,
        paddingHorizontal: 30,
        paddingVertical: 28,
        gap: 14,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      // 居中块：宽度封顶，窄栏里不拉成一条
      briefBlock: { width: "100%" as const, maxWidth: 420, alignItems: "center" as const, gap: 14 },
      // 日期 / 频道 / 条数贴在一起
      briefTight: { alignItems: "center" as const, gap: 6 },
      briefRule: { width: 40, height: 2, backgroundColor: p.accent },
      briefDivider: { width: "100%" as const, height: 1, backgroundColor: p.rule },
      briefTitle: {
        fontFamily: FONT.serif,
        fontSize: 24,
        fontWeight: "600" as const,
        letterSpacing: 3,
        color: p.ink,
        textAlign: "center" as const,
      },
      briefChannel: { fontFamily: FONT.serif, fontSize: 18, color: p.ink, textAlign: "center" as const },
      briefCount: { fontFamily: FONT.serif, fontSize: 14, color: p.muted, textAlign: "center" as const },
      briefCountNum: { fontFamily: FONT.serif, fontSize: 30, fontWeight: "600" as const, color: p.accent },
      briefLatest: {
        fontFamily: FONT.serif,
        fontSize: 17,
        lineHeight: 25,
        color: p.ink,
        textAlign: "center" as const,
      },
      briefMeta: { fontFamily: FONT.serif, fontSize: 13, color: p.muted, textAlign: "center" as const },
      briefActions: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 10,
      },
      // 刷新只留图标：无文字、无边框
      briefIcon: { width: 40, height: 40, alignItems: "center" as const, justifyContent: "center" as const },
    };
  }, [colors, layout.compact]);

  const isStarView = channel === "mine" && showStar;

  async function refresh() {
    if (isStarView && !starGithub) return;
    setRefreshing(true);
    try {
      const target = starGithub ? "github-stars" : channel;
      const fresh = await list({ channel: target as ChannelId, limit: 60, force: true });
      queryClient.setQueryData(["lantern", target], fresh);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刷新失败");
    } finally {
      setRefreshing(false);
    }
  }

  const rawData = useMemo(() => {
    if (starGithub) return githubQuery.data?.items ?? [];
    if (isStarView) return state.star;
    return query.data?.items ?? [];
  }, [starGithub, githubQuery.data?.items, isStarView, state.star, query.data?.items]);

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

  const isPending = starGithub ? githubQuery.isPending : !isStarView && query.isPending;
  const isError = starGithub ? githubQuery.isError : !isStarView && query.isError;
  const activeError = starGithub ? githubQuery.error : query.error;
  const statusText = starGithub
    ? githubQuery.data
      ? `${stateLabel(githubQuery.data.state)} ${formatTime(githubQuery.data.fetchedAt)}`
      : ""
    : isStarView
      ? `${state.star.length} 条收藏`
      : query.data
        ? `${stateLabel(query.data.state)} ${formatTime(query.data.fetchedAt)}`
        : "";

  const channelMeta = CHANNELS.find((entry) => entry.id === channel);

  function renderByline(item: FeedItem) {
    const source = sourceName(item);
    return (
      <View style={styles.byline}>
        {source ? (
          <>
            <Text style={styles.bylineSource} numberOfLines={1}>
              {source}
            </Text>
            <Text style={styles.bylineSep}>·</Text>
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
        onLongPress={isStarView && !starGithub ? () => setUnstarTarget(item) : undefined}
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
        <Image source={{ uri: wordmark }} style={styles.wordmarkImage} resizeMode="contain" />
      </View>

      <View style={styles.channelRow}>
        {CHANNELS.map((entry) => {
          const active = entry.id === channel;
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`频道：${entry.full}`}
              onPress={() => {
                setChannel(entry.id);
                setShowStar(false);
                setSubsOpen(false);
              }}
              style={styles.channelCell}
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
      <View style={styles.channelSpacer} />

      {isStarView ? (
        <View style={styles.starTabs}>
          {(
            [
              { id: "articles", title: "文章" },
              { id: "github", title: "GitHub 收藏" },
            ] as const
          ).map((tab) => {
            const active = starTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityLabel={`收藏分类：${tab.title}`}
                onPress={() => {
                  setStarTab(tab.id);
                  setKeyword("");
                }}
                style={[styles.starTab, active ? styles.starTabActive : null]}
              >
                <Text style={active ? styles.starTabTextActive : styles.starTabText}>
                  {tab.title}
                </Text>
              </Pressable>
            );
          })}
          <View style={styles.starTabSpacer} />
          {starTab === "github" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="刷新收藏"
              disabled={refreshing}
              onPress={() => void refresh()}
              hitSlop={8}
              style={styles.starRefresh}
            >
              <Icon name="RotateCw" size={15} color={refreshing ? colors.accent : colors.muted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

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
            {activeError instanceof Error ? activeError.message : "载入失败"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="重试"
            onPress={() => void (starGithub ? githubQuery.refetch() : query.refetch())}
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
          refreshing={isStarView && !starGithub ? false : refreshing}
          onRefresh={isStarView && !starGithub ? undefined : () => void refresh()}
          contentContainerStyle={
            data.length === 0 ? { flexGrow: 1 } : channel === "mine" ? { paddingBottom: 96 } : undefined
          }
          ListFooterComponent={
            rawData.length > 0 ? (
              <View style={styles.footer}>
                <Text style={styles.footerText} numberOfLines={1}>
                  {statusText}
                </Text>
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
                    name={isStarView ? "Star" : channel === "mine" ? "Plus" : "Inbox"}
                    size={26}
                    color={colors.muted}
                  />
                  <Text style={styles.stateText}>
                    {starGithub
                      ? "拉不到收藏的仓库"
                      : isStarView
                        ? "还没有收藏"
                        : channel === "mine"
                          ? "还没有订阅"
                          : "暂无内容"}
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}

      {channel === "mine" ? (
        <View style={styles.fabStack}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`收藏，${state.star.length} 条`}
            onPress={() => {
              setShowStar(!isStarView);
              setSubsOpen(false);
            }}
            style={[styles.fab, isStarView ? styles.fabQuiet : null]}
          >
            <Icon
              name="Star"
              size={22}
              color={isStarView ? colors.accent : colors.onAccent}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="订阅管理"
            onPress={() => setSubsOpen(!subsOpen)}
            style={styles.fab}
          >
            <Icon name="Settings" size={22} color={colors.onAccent} />
          </Pressable>
        </View>
      ) : null}

      <SubsPanel
        theme={theme}
        layout={layout}
        // 桌面在右栏内联展示，不开弹层；手机继续用弹层
        open={subsOpen && layout.compact}
        onOpenChange={setSubsOpen}
      />

      <LanternSheet
        theme={theme}
        layout={layout}
        open={unstarTarget !== null}
        title="取消收藏"
        onClose={() => setUnstarTarget(null)}
      >
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
      </LanternSheet>
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
          {subsOpen ? (
            <SubsPanel theme={theme} layout={layout} open onOpenChange={setSubsOpen} variant="pane" />
          ) : (
            articlePane ?? (
              <View style={styles.brief}>
                <View style={styles.briefBlock}>
                  <Text style={styles.briefTitle}>今日速览</Text>
                  <View style={styles.briefRule} />
                  <View style={styles.briefTight}>
                    <Text style={styles.briefChannel}>
                      {starGithub ? "GitHub 收藏" : isStarView ? "收藏" : (channelMeta?.full ?? "")}
                    </Text>
                    <Text style={styles.briefCount}>
                      <Text style={styles.briefCountNum}>{rawData.length}</Text> 条内容
                    </Text>
                  </View>
                  <View style={styles.briefDivider} />
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
                </View>
                <View style={styles.briefActions}>
                  {isStarView && !starGithub ? null : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="刷新"
                      disabled={refreshing}
                      onPress={() => void refresh()}
                      hitSlop={8}
                      style={styles.briefIcon}
                    >
                      <Icon name="RotateCw" size={17} color={refreshing ? colors.accent : colors.ink} />
                    </Pressable>
                  )}
                </View>
              </View>
            )
          )}
        </View>
      </View>
    );
  }

  return articlePane ?? listPane;
}
