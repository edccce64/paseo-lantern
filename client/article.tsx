import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { openExternalUrl, useRpc } from "@getpaseo/plugin/client";
import { Markdown, useToast } from "@getpaseo/plugin/client/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { type ArticleVersion, articleRpc } from "../shared/article";
import type { FeedItem } from "../shared/feed";

const VERSION_LABELS: Array<{ id: ArticleVersion; title: string }> = [
  { id: "original", title: "原文" },
  { id: "translation", title: "译文" },
  { id: "rewrite", title: "乔木改写" },
];

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Props = {
  item: FeedItem;
  theme: PluginScreenProps["theme"];
  layout: PluginScreenProps["layout"];
  onBack: () => void;
};

export function ArticleView({ item, theme, layout, onBack }: Props) {
  const toast = useToast();
  const article = useRpc(articleRpc);
  const [version, setVersion] = useState<ArticleVersion>("original");
  const isQiaomu = item.source === "qiaomu";

  const query = useQuery({
    queryKey: ["lantern-article", item.id, version],
    queryFn: () => article({ id: item.id, version }),
    enabled: isQiaomu,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const styles = useMemo(() => {
    const horizontal = layout.compact ? 16 : 28;
    return {
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      topBar: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        paddingHorizontal: horizontal - 8,
        height: 48,
      },
      back: { minHeight: 44, justifyContent: "center" as const, paddingHorizontal: 8 },
      backText: { color: theme.colors.accent, fontSize: 15 },
      body: { flex: 1 },
      bodyContent: { paddingHorizontal: horizontal, paddingBottom: 32, gap: 12 },
      title: {
        color: theme.colors.foreground,
        fontSize: layout.compact ? 22 : 26,
        lineHeight: layout.compact ? 31 : 36,
      },
      meta: { color: theme.colors.foregroundMuted, fontSize: 12, lineHeight: 18 },
      versions: { flexDirection: "row" as const, gap: 8, flexWrap: "wrap" as const },
      chip: {
        minHeight: 40,
        paddingHorizontal: 14,
        justifyContent: "center" as const,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      chipOn: {
        minHeight: 40,
        paddingHorizontal: 14,
        justifyContent: "center" as const,
        borderRadius: 999,
        backgroundColor: theme.colors.accent,
      },
      chipOff: {
        minHeight: 40,
        paddingHorizontal: 14,
        justifyContent: "center" as const,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        opacity: 0.4,
      },
      chipText: { color: theme.colors.foreground, fontSize: 14 },
      chipTextOn: { color: theme.colors.accentForeground, fontSize: 14 },
      note: { color: theme.colors.foregroundMuted, fontSize: 13, lineHeight: 20 },
      bottom: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingHorizontal: horizontal,
        paddingVertical: 10,
        flexDirection: "row" as const,
        gap: 12,
      },
      primary: {
        flex: 1,
        minHeight: 44,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderRadius: 10,
        backgroundColor: theme.colors.accent,
      },
      primaryText: { color: theme.colors.accentForeground, fontSize: 15 },
    };
  }, [theme, layout.compact]);

  const result = isQiaomu ? query.data : null;
  const versions = result?.versions ?? { original: true, translation: false, rewrite: false };
  const loading = isQiaomu && query.isPending;
  const error = isQiaomu ? query.error : null;
  const markdown = isQiaomu ? (result?.markdown ?? null) : item.summary;
  const note = isQiaomu ? (result?.note ?? null) : "AIHOT 不提供单篇正文，摘要如下。";
  const publishedAt = isQiaomu ? (result?.publishedAt ?? item.publishedAt) : item.publishedAt;
  const origin = isQiaomu ? (result?.origin ?? item.origin) : item.origin;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回列表"
          onPress={onBack}
          style={styles.back}
        >
          <Text style={styles.backText}>返回</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>
          {origin} · {formatWhen(publishedAt)}
        </Text>

        {isQiaomu ? (
          <View style={styles.versions}>
            {VERSION_LABELS.map((entry) => {
              const available =
                entry.id === "original"
                  ? versions.original
                  : entry.id === "translation"
                    ? versions.translation
                    : versions.rewrite;
              const active = entry.id === version;
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityLabel={`版本：${entry.title}`}
                  disabled={!available}
                  onPress={() => setVersion(entry.id)}
                  style={active ? styles.chipOn : available ? styles.chip : styles.chipOff}
                >
                  <Text style={active ? styles.chipTextOn : styles.chipText}>{entry.title}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {loading ? <Text style={styles.note}>正在取正文</Text> : null}

        {error ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.note}>
              {error instanceof Error ? error.message : "正文载入失败"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="重试载入正文"
              onPress={() => void query.refetch()}
              style={styles.chip}
            >
              <Text style={styles.chipText}>重试</Text>
            </Pressable>
          </View>
        ) : null}

        {note && !loading ? <Text style={styles.note}>{note}</Text> : null}

        {markdown && !loading ? <Markdown>{markdown}</Markdown> : null}
        {!markdown && !loading && !error ? <Text style={styles.note}>这篇没有可显示的正文。</Text> : null}
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="打开原文"
          onPress={() => {
            void openExternalUrl(item.url).catch(() => toast.error("打不开这个链接"));
          }}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>打开原文</Text>
        </Pressable>
      </View>
    </View>
  );
}
