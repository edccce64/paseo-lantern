import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { copyText, TextInput, useToast } from "@getpaseo/plugin/client/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementRef } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import {
  subsAddRpc,
  subsExportRpc,
  subsImportRpc,
  subsListRpc,
  subsRemoveRpc,
  subsSuggestRpc,
} from "../shared/subs";
import { LanternSheet } from "./sheet";
import { FONT, palette } from "./style";

type Props = {
  theme: PluginScreenProps["theme"];
  layout: PluginScreenProps["layout"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type TabId = "subs" | "discover";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "subs", label: "已订阅" },
  { id: "discover", label: "发现" },
];

export function SubsPanel({ theme, layout, open, onOpenChange }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const listSubs = useRpc(subsListRpc);
  const addSub = useRpc(subsAddRpc);
  const removeSub = useRpc(subsRemoveRpc);
  const importSubs = useRpc(subsImportRpc);
  const exportSubs = useRpc(subsExportRpc);
  const suggest = useRpc(subsSuggestRpc);

  const [tab, setTab] = useState<TabId>("subs");
  const [url, setUrl] = useState("");
  const [opml, setOpml] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showRss, setShowRss] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  /** 正在等第二次确认的订阅 id */
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const searchRef = useRef<ElementRef<typeof TextInput>>(null);
  const { width } = useWindowDimensions();
  const narrow = width < 340;

  // 输入法组字时不要每敲一个拼音就发请求；停手 350ms 再搜
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // 重新打开弹窗时复位删除确认态，避免残留的「删除？」行
  useEffect(() => {
    if (open) setConfirmId(null);
  }, [open]);

  const query = useQuery({
    queryKey: ["lantern-subs"],
    queryFn: () => listSubs({}),
    enabled: open,
  });

  const needle = debounced.trim();
  const suggestions = useQuery({
    queryKey: ["lantern-suggest", needle],
    // 空查询是浏览模式，多给几条；搜索时只给最接近的 8 条
    queryFn: () => suggest({ query: needle, limit: needle.length === 0 ? 24 : 8 }),
    // 目录在空查询时也返回推荐源，打开「发现」就有内容
    enabled: open && tab === "discover",
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["lantern-subs"] });
    void queryClient.invalidateQueries({ queryKey: ["lantern", "mine"] });
  };

  const add = useMutation({
    mutationFn: (input: { url: string; title?: string }) => addSub(input),
    onSuccess: ({ item }) => {
      setUrl("");
      toast.show(`已添加：${item.title}`, { variant: "success" });
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "添加失败");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeSub({ id }),
    onSuccess: () => {
      setConfirmId(null);
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "删除失败");
    },
  });

  const importOpml = useMutation({
    mutationFn: (text: string) => importSubs({ opml: text }),
    onSuccess: (result) => {
      setOpml("");
      setShowImport(false);
      toast.show(`导入 ${result.added} 个，跳过 ${result.skipped} 个`, { variant: "success" });
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "导入失败");
    },
  });

  const styles = useMemo(() => {
    const p = palette(theme);
    const horizontal = layout.compact ? 16 : 20;
    return {
      p,
      // 栏目横排：像报纸的栏目头，选中的那条压一条 accent 线
      tabBar: {
        flexDirection: "row" as const,
        borderBottomWidth: 1,
        borderBottomColor: p.rule,
      },
      tab: {
        flex: 1,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        minHeight: 44,
      },
      tabLabel: {
        fontFamily: FONT.mono,
        fontSize: 12,
        letterSpacing: 1.4,
        paddingBottom: 3,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
      },
      tabLabelOn: { color: p.accent, borderBottomColor: p.accent },
      tabLabelOff: { color: p.muted },
      body: { paddingHorizontal: horizontal, paddingTop: 14, paddingBottom: 18 },
      row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: p.rule,
      },
      rowBody: { flex: 1, gap: 3 },
      itemTitle: {
        fontFamily: FONT.serif,
        color: p.ink,
        fontSize: 15,
        lineHeight: 21,
      },
      itemUrl: { fontFamily: FONT.mono, color: p.muted, fontSize: 11, lineHeight: 16 },
      iconButton: {
        width: 28,
        height: 28,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      iconGlyph: { fontFamily: FONT.sans, color: p.muted, fontSize: 18, lineHeight: 20 },
      confirmRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
      confirmText: { fontFamily: FONT.sans, color: p.inkSoft, fontSize: 12 },
      smallButton: {
        minHeight: 28,
        paddingHorizontal: 10,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderWidth: 1,
        borderRadius: 2,
      },
      smallButtonOn: { borderColor: p.accent },
      smallButtonOnText: { fontFamily: FONT.sans, color: p.accent, fontSize: 12 },
      smallButtonOff: { borderColor: p.rule },
      smallButtonOffText: { fontFamily: FONT.sans, color: p.muted, fontSize: 12 },
      outlineRow: { flexDirection: "row" as const, gap: 10, marginTop: 14 },
      outlineButton: {
        flex: 1,
        minHeight: 38,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        borderWidth: 1,
        borderColor: p.rule,
        borderRadius: 2,
      },
      outlineText: { fontFamily: FONT.sans, color: p.ink, fontSize: 13 },
      input: {
        minHeight: 40,
        borderWidth: 1,
        borderColor: p.rule,
        borderRadius: 2,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: p.ink,
        backgroundColor: p.panel,
        fontFamily: FONT.sans,
        fontSize: 14,
      },
      searchWrap: { position: "relative" as const },
      searchInput: { paddingRight: 34 },
      searchClear: {
        position: "absolute" as const,
        top: 0,
        bottom: 0,
        right: 0,
        width: 34,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      clearText: { fontFamily: FONT.mono, color: p.muted, fontSize: 11, letterSpacing: 1 },
      rssRow: {
        flexDirection: (narrow ? "column" : "row") as "column" | "row",
        alignItems: (narrow ? "stretch" : "center") as "stretch" | "center",
        gap: 10,
      },
      area: {
        minHeight: 96,
        borderWidth: 1,
        borderColor: p.rule,
        borderRadius: 2,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: p.ink,
        backgroundColor: p.panel,
        fontFamily: FONT.mono,
        fontSize: 12,
        textAlignVertical: "top" as const,
      },
      solidButton: {
        minHeight: 40,
        paddingHorizontal: 16,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderRadius: 2,
        backgroundColor: p.accent,
      },
      solidText: { fontFamily: FONT.sans, color: p.paper, fontSize: 13 },
      foldRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingVertical: 8,
      },
      foldText: { fontFamily: FONT.mono, color: p.inkSoft, fontSize: 11, letterSpacing: 1 },
      foldMark: { fontFamily: FONT.mono, color: p.accent, fontSize: 14 },
      kicker: {
        fontFamily: FONT.mono,
        color: p.muted,
        fontSize: 10,
        letterSpacing: 2,
        marginTop: 14,
        marginBottom: 2,
      },
      empty: { fontFamily: FONT.sans, color: p.muted, fontSize: 13, paddingVertical: 12 },
      note: { fontFamily: FONT.sans, color: p.muted, fontSize: 12, paddingVertical: 8 },
      subscribeButton: {
        minHeight: 30,
        paddingHorizontal: 12,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderWidth: 1,
        borderColor: p.accent,
        borderRadius: 2,
      },
      subscribeText: { fontFamily: FONT.sans, color: p.accent, fontSize: 12 },
      subscribedText: { fontFamily: FONT.mono, color: p.muted, fontSize: 11, letterSpacing: 1 },
    };
  }, [theme, layout.compact, narrow]);

  const items = query.data?.items ?? [];

  function renderSubscribed() {
    return (
      <View>
        {items.length === 0 ? <Text style={styles.empty}>还没有订阅</Text> : null}
        {items.map((item) => {
          const confirming = confirmId === item.id;
          return (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.itemUrl} numberOfLines={1}>
                  {item.url}
                </Text>
              </View>
              {confirming ? (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmText}>删除？</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`确认删除：${item.title}`}
                    disabled={remove.isPending}
                    onPress={() => remove.mutate(item.id)}
                    style={[styles.smallButton, styles.smallButtonOn]}
                  >
                    <Text style={styles.smallButtonOnText}>
                      {remove.isPending ? "删除中" : "删掉"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`取消删除：${item.title}`}
                    onPress={() => setConfirmId(null)}
                    style={[styles.smallButton, styles.smallButtonOff]}
                  >
                    <Text style={styles.smallButtonOffText}>取消</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`删除订阅：${item.title}`}
                  hitSlop={8}
                  onPress={() => setConfirmId(item.id)}
                  style={styles.iconButton}
                >
                  <Text style={styles.iconGlyph}>×</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {showImport ? (
          <View style={{ gap: 10, marginTop: 12 }}>
            <TextInput
              value={opml}
              onChangeText={setOpml}
              placeholder="把 OPML 内容粘贴到这里"
              placeholderTextColor={styles.p.muted}
              multiline
              style={styles.area}
            />
            {opml.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="清除已粘贴的 OPML"
                hitSlop={8}
                onPress={() => setOpml("")}
                style={{ alignSelf: "flex-end" }}
              >
                <Text style={styles.clearText}>清除</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="确认导入"
              disabled={importOpml.isPending || opml.trim().length === 0}
              onPress={() => importOpml.mutate(opml)}
              style={styles.solidButton}
            >
              <Text style={styles.solidText}>
                {importOpml.isPending ? "导入中" : "确认导入"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  /** 导入 / 导出常驻弹层底部，不随列表滚动 */
  const opmlFooter = (
    <View style={styles.outlineRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="导入 OPML"
        onPress={() => setShowImport((value) => !value)}
        style={styles.outlineButton}
      >
        <Text style={styles.outlineText}>导入 OPML</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="导出 OPML"
        onPress={() => {
          void (async () => {
            try {
              const result = await exportSubs({});
              await copyText(result.opml);
              toast.show("OPML 已复制到剪贴板", { variant: "success" });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "导出失败");
            }
          })();
        }}
        style={styles.outlineButton}
      >
        <Text style={styles.outlineText}>导出 OPML</Text>
      </Pressable>
    </View>
  );

  function renderDiscover() {
    const resultCount = suggestions.data?.items.length ?? 0;
    return (
      <View>
        <View style={styles.searchWrap}>
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder="搜博客、作者或标签"
            placeholderTextColor={styles.p.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.searchInput]}
          />
          {search.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="清空搜索"
              hitSlop={8}
              onPress={() => {
                setSearch("");
                searchRef.current?.focus();
              }}
              style={styles.searchClear}
            >
              <Text style={styles.iconGlyph}>×</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="用 RSS 地址添加"
          onPress={() => setShowRss((value) => !value)}
          style={styles.foldRow}
        >
          <Text style={styles.foldText}>用 RSS 地址添加</Text>
          <Text style={styles.foldMark}>{showRss ? "−" : "+"}</Text>
        </Pressable>

        {showRss ? (
          <View style={styles.rssRow}>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com/feed.xml"
              placeholderTextColor={styles.p.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, narrow ? undefined : { flex: 1 }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="添加订阅"
              disabled={add.isPending || url.trim().length === 0}
              onPress={() => add.mutate({ url: url.trim() })}
              style={styles.solidButton}
            >
              <Text style={styles.solidText}>{add.isPending ? "添加中" : "添加"}</Text>
            </Pressable>
          </View>
        ) : null}

        {suggestions.isPending ? (
          <Text style={styles.note}>正在搜</Text>
        ) : resultCount === 0 ? (
          <Text style={styles.empty}>没有匹配的源</Text>
        ) : (
          <View>
            {needle.length === 0 ? <Text style={styles.kicker}>推荐源</Text> : null}
            {suggestions.data?.items.map((entry) => {
              const subscribed = items.some((item) => item.url === entry.url);
              const meta = [entry.site, entry.tags.join(" · ")].filter(Boolean).join(" · ");
              return (
                <View key={entry.url} style={styles.row}>
                  <View style={styles.rowBody}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {entry.name}
                    </Text>
                    <Text style={styles.itemUrl} numberOfLines={1}>
                      {meta.length > 0 ? meta : entry.url}
                    </Text>
                  </View>
                  {subscribed ? (
                    <Text style={styles.subscribedText}>已订阅</Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`订阅：${entry.name}`}
                      disabled={add.isPending}
                      onPress={() => add.mutate({ url: entry.url, title: entry.name })}
                      style={styles.subscribeButton}
                    >
                      <Text style={styles.subscribeText}>订阅</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  return (
    <LanternSheet
      theme={theme}
      layout={layout}
      open={open}
      title="订阅管理"
      onClose={() => onOpenChange(false)}
      footer={tab === "subs" ? opmlFooter : null}
    >
      <View style={styles.tabBar}>
        {TABS.map((entry) => {
          const active = tab === entry.id;
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={entry.label}
              onPress={() => {
                setTab(entry.id);
                setConfirmId(null);
              }}
              style={styles.tab}
            >
              <Text
                numberOfLines={1}
                style={[styles.tabLabel, active ? styles.tabLabelOn : styles.tabLabelOff]}
              >
                {entry.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "subs" ? renderSubscribed() : renderDiscover()}
    </LanternSheet>
  );
}
