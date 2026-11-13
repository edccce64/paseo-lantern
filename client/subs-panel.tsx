import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { copyText, Modal, TextInput, useToast } from "@getpaseo/plugin/client/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  subsAddRpc,
  subsExportRpc,
  subsImportRpc,
  subsListRpc,
  subsRemoveRpc,
  subsSuggestRpc,
} from "../shared/subs";

type Props = {
  theme: PluginScreenProps["theme"];
  layout: PluginScreenProps["layout"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SubsPanel({ theme, layout, open, onOpenChange }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const listSubs = useRpc(subsListRpc);
  const addSub = useRpc(subsAddRpc);
  const removeSub = useRpc(subsRemoveRpc);
  const importSubs = useRpc(subsImportRpc);
  const exportSubs = useRpc(subsExportRpc);
  const suggest = useRpc(subsSuggestRpc);

  const [url, setUrl] = useState("");
  const [opml, setOpml] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // 输入法组字时不要每敲一个拼音就发请求；停手 350ms 再搜
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: ["lantern-subs"],
    queryFn: () => listSubs({}),
    enabled: open,
  });

  const needle = debounced.trim();
  const suggestions = useQuery({
    queryKey: ["lantern-suggest", needle],
    queryFn: () => suggest({ query: needle, limit: 8 }),
    enabled: open && needle.length > 0,
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
    onSuccess: () => invalidate(),
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
    const horizontal = layout.compact ? 4 : 8;
    return {
      content: { gap: 12, paddingHorizontal: horizontal },
      row: {
        paddingVertical: 10,
        gap: 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      },
      rowTitle: { color: theme.colors.foreground, fontSize: 15, lineHeight: 21 },
      rowUrl: { color: theme.colors.foregroundMuted, fontSize: 12, lineHeight: 17 },
      rowLine: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
      grow: { flex: 1 },
      input: {
        minHeight: 44,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: theme.colors.foreground,
        fontSize: 15,
      },
      area: {
        minHeight: 96,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: theme.colors.foreground,
        fontSize: 13,
        textAlignVertical: "top" as const,
      },
      action: {
        minHeight: 44,
        paddingHorizontal: 16,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderRadius: 10,
        backgroundColor: theme.colors.accent,
      },
      actionText: { color: theme.colors.accentForeground, fontSize: 15 },
      ghost: {
        minHeight: 44,
        paddingHorizontal: 16,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      ghostText: { color: theme.colors.foreground, fontSize: 14 },
      link: { color: theme.colors.statusDanger, fontSize: 14, paddingVertical: 8 },
      linkAction: { color: theme.colors.accent, fontSize: 14, paddingVertical: 8 },
      note: { color: theme.colors.foregroundMuted, fontSize: 12, lineHeight: 18 },
      actions: { flexDirection: "row" as const, gap: 10 },
    };
  }, [theme, layout.compact]);

  const items = query.data?.items ?? [];

  return (
    <Modal title="订阅管理" open={open} onOpenChange={onOpenChange}>
      <Modal.Content contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 0 }}>
              {items.length === 0 ? (
                <Text style={styles.note}>还没有订阅</Text>
              ) : null}
              {items.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={styles.rowLine}>
                    <View style={styles.grow}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.rowUrl} numberOfLines={1}>
                        {item.url}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`删除订阅：${item.title}`}
                      disabled={remove.isPending}
                      onPress={() => remove.mutate(item.id)}
                    >
                      <Text style={styles.link}>删除</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
          </View>

          <View style={styles.rowLine}>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com/feed.xml"
              placeholderTextColor={theme.colors.foregroundMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, styles.grow]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="添加订阅"
              disabled={add.isPending || url.trim().length === 0}
              onPress={() => add.mutate({ url: url.trim() })}
              style={styles.action}
            >
              <Text style={styles.actionText}>{add.isPending ? "添加中" : "添加"}</Text>
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="搜博客、作者或标签"
              placeholderTextColor={theme.colors.foregroundMuted}
              style={styles.input}
            />
            {needle.length > 0 ? (
              <View>
                {suggestions.isPending ? (
                  <Text style={styles.note}>正在搜</Text>
                ) : (suggestions.data?.items.length ?? 0) === 0 ? (
                  <Text style={styles.note}>没有匹配的源</Text>
                ) : (
                  suggestions.data?.items.map((entry) => {
                    const subscribed = items.some((item) => item.url === entry.url);
                    return (
                      <View key={entry.url} style={styles.row}>
                        <View style={styles.rowLine}>
                          <View style={styles.grow}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {entry.name}
                            </Text>
                            <Text style={styles.rowUrl} numberOfLines={1}>
                              {entry.tags.length > 0 ? entry.tags.join(" · ") : entry.url}
                            </Text>
                          </View>
                          {subscribed ? (
                            <Text style={styles.note}>已订阅</Text>
                          ) : (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`订阅：${entry.name}`}
                              disabled={add.isPending}
                              hitSlop={8}
                              onPress={() => add.mutate({ url: entry.url, title: entry.name })}
                            >
                              <Text style={styles.linkAction}>订阅</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="导入 OPML"
              onPress={() => setShowImport((value) => !value)}
              style={[styles.ghost, styles.grow]}
            >
              <Text style={styles.ghostText}>{showImport ? "收起导入" : "导入 OPML"}</Text>
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
              style={[styles.ghost, styles.grow]}
            >
              <Text style={styles.ghostText}>导出 OPML</Text>
            </Pressable>
          </View>

          {showImport ? (
            <View style={{ gap: 10 }}>
              <TextInput
                value={opml}
                onChangeText={setOpml}
                placeholder="把 OPML 内容粘贴到这里"
                placeholderTextColor={theme.colors.foregroundMuted}
                multiline
                style={styles.area}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="确认导入"
                disabled={importOpml.isPending || opml.trim().length === 0}
                onPress={() => importOpml.mutate(opml)}
                style={styles.action}
              >
                <Text style={styles.actionText}>
                  {importOpml.isPending ? "导入中" : "确认导入"}
                </Text>
              </Pressable>
            </View>
          ) : null}
      </Modal.Content>
    </Modal>
  );
}
