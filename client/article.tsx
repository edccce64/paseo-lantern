import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { openExternalUrl, usePaseo, useRpc, useSettings } from "@getpaseo/plugin/client";
import { Icon, useToast } from "@getpaseo/plugin/client/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { type ArticleVersion, articleRpc } from "../shared/article";
import type { FeedItem } from "../shared/feed";
import { EMPTY_STATE, itemKey, lanternStateSettings } from "../shared/settings";
import { translateRequestRpc, translateStatusRpc } from "../shared/translate";
import { buildCompanionPrompt } from "./companion";
import { FONT, LABEL, type Palette, palette } from "./style";
import { LanternSheet } from "./sheet";

const VERSION_LABELS: Array<{ id: ArticleVersion; title: string }> = [
  { id: "original", title: "原文" },
  { id: "translation", title: "译文" },
  { id: "rewrite", title: "乔木改写" },
];

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** NOV 13, 2026 · 20:00 */
function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 频道名：从条目自身反推，正文页拿不到列表页的当前频道 */
function channelName(item: FeedItem): string {
  if (item.source === "qiaomu") return "乔木精选";
  if (item.source === "rss") return "我的订阅";
  if (item.badge && item.badge.includes("家信源")) return "AIHOT 热点";
  return "AIHOT 精选";
}

/* ---------- 轻量 Markdown ---------- */

type InlineToken = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
};

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "para"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; text: string }
  | { kind: "image"; src: string; alt: string }
  | { kind: "rule" }
  | { kind: "table"; header: string[]; rows: string[][] };

const INLINE_RE = /(!?\[[^\]]*\]\([^)\s]+\)|\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;

function parseLink(raw: string): { text: string; href: string } {
  // raw 形如 [文字](地址) 或 ![说明](地址)
  const close = raw.indexOf("]");
  const start = raw.startsWith("![") ? 3 : 1;
  const text = raw.slice(start, close);
  const href = raw.slice(close + 2, raw.length - 1);
  return { text, href };
}

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const re = new RegExp(INLINE_RE.source, "g");
  let last = 0;
  let match: RegExpExecArray | null = re.exec(text);
  while (match) {
    const raw = match[0];
    if (match.index > last) tokens.push({ text: text.slice(last, match.index) });
    if (raw.startsWith("![")) {
      const link = parseLink(raw);
      tokens.push({ text: link.text || "图片", href: link.href });
    } else if (raw.startsWith("[")) {
      const link = parseLink(raw);
      tokens.push({ text: link.text, href: link.href });
    } else if (raw.startsWith("**")) {
      tokens.push({ text: raw.slice(2, -2), bold: true });
    } else if (raw.startsWith("`")) {
      tokens.push({ text: raw.slice(1, -1), code: true });
    } else {
      tokens.push({ text: raw.slice(1, -1), italic: true });
    }
    last = match.index + raw.length;
    match = re.exec(text);
  }
  if (last < text.length) tokens.push({ text: text.slice(last) });
  return tokens;
}

function isBlockStart(line: string): boolean {
  const t = line.trim();
  return (
    t.length === 0 ||
    NOISE_LINE.test(t) ||
    t.startsWith("```") ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(t) ||
    /^#{1,6}\s/.test(t) ||
    /^>\s?/.test(t) ||
    /^([-*+])\s/.test(t) ||
    /^\d+[.)]\s/.test(t)
  );
}

/** 只有括号、无文字的行：抓取时残留的空链接碎片，直接丢掉 */
const NOISE_LINE = /^[\s\[\]\(\)]+$/;

/**
 * 把原始 Markdown 规整成可渲染的样子。
 * 1. 图片套链接写法的外层链接去掉，只留图片。
 * 2. 反斜杠转义还原：\_ \* 这类变成字面字符。
 */
function normalizeMarkdown(source: string): string {
  let out = source;
  // [\n\n![](图)\n\n](链接) → ![](图)
  out = out.replace(/\[\s*(!\[[^\]]*\]\([^)\s]*\))\s*\]\([^)\s]*\)/g, "$1");
  out = out.replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, "$1");
  return out;
}

/** 管状表格的分隔行：| --- | :-- | ---: | 形式 */
function isTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith("|") || !t.endsWith("|")) return false;
  const cells = t.slice(1, -1).split("|");
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-+:?$/.test(cell.trim()));
}

/** 拆一行表格单元格，去掉首尾管道并去掉空白 */
function splitTableRow(line: string): string[] {
  let inner = line.trim();
  if (inner.startsWith("|")) inner = inner.slice(1);
  if (inner.endsWith("|")) inner = inner.slice(0, -1);
  return inner.split("|").map((cell) => cell.trim());
}

function parseBlocks(source: string): Block[] {
  const lines = normalizeMarkdown(source).replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.length === 0 || NOISE_LINE.test(trimmed)) {
      i += 1;
      continue;
    }
    // 独占一行的图片：![说明](地址)
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(trimmed);
    if (image) {
      blocks.push({ kind: "image", alt: image[1], src: image[2] });
      i += 1;
      continue;
    }
    if (trimmed.startsWith("```")) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ kind: "code", text: buf.join("\n") });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ kind: "rule" });
      i += 1;
      continue;
    }
    // 管状表格：以 | 开头，且下一非空行是 |---|---| 形式的分隔行
    if (trimmed.startsWith("|")) {
      let sep = i + 1;
      while (sep < lines.length && lines[sep].trim().length === 0) sep += 1;
      if (sep < lines.length && isTableSeparator(lines[sep])) {
        const header = splitTableRow(trimmed);
        const rows: string[][] = [];
        i = sep + 1;
        while (i < lines.length) {
          const t = lines[i].trim();
          if (t.length === 0 || !t.startsWith("|")) break;
          rows.push(splitTableRow(t));
          i += 1;
        }
        blocks.push({ kind: "table", header, rows });
        continue;
      }
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ kind: "quote", text: buf.join(" ") });
      continue;
    }
    const bullet = /^([-*+])\s+(.*)$/.exec(trimmed);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || ordered) {
      const isOrdered = ordered !== null;
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const b = /^([-*+])\s+(.*)$/.exec(t);
        const o = /^\d+[.)]\s+(.*)$/.exec(t);
        if (isOrdered && o) {
          items.push(o[1]);
          i += 1;
          continue;
        }
        if (!isOrdered && b) {
          items.push(b[2]);
          i += 1;
          continue;
        }
        if (items.length > 0 && t.length > 0 && !isBlockStart(t)) {
          items[items.length - 1] = `${items[items.length - 1]} ${t}`;
          i += 1;
          continue;
        }
        break;
      }
      blocks.push({ kind: "list", ordered: isOrdered, items });
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (t.length === 0 || isBlockStart(t)) break;
      buf.push(t);
      i += 1;
    }
    blocks.push({ kind: "para", text: buf.join(" ") });
  }
  return blocks;
}

/** 头像、站点 logo、头像缩图：正文阅读时是噪声，直接不渲染 */
const NOISE_IMAGE = /(profile_images|\/avatar|\/logo|favicon|sprite|1x1\.|pixel\.gif)/i;

/**
 * 正文图片：先按 16:9 占位，拿到真实尺寸后用真实宽高比，不裁切。
 */
function ArticleImage({ src, alt, colors }: { src: string; alt: string; colors: Palette }) {
  const [ratio, setRatio] = useState(16 / 9);
  const [failed, setFailed] = useState(false);
  const skipped = NOISE_IMAGE.test(src);

  useEffect(() => {
    if (skipped) return;
    let alive = true;
    Image.getSize(
      src,
      (width, height) => {
        if (alive && width > 0 && height > 0) setRatio(width / height);
      },
      () => {
        if (alive) setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [src, skipped]);

  if (skipped || failed) return null;

  return (
    <View style={{ marginVertical: 14, gap: 6 }}>
      <Image
        source={{ uri: src }}
        style={{ width: "100%", aspectRatio: ratio, borderRadius: 3, backgroundColor: colors.panel }}
        resizeMode="contain"
      />
      {alt ? (
        <Text style={{ color: colors.muted, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 0.5 }}>
          {alt}
        </Text>
      ) : null}
    </View>
  );
}

type Props = {
  item: FeedItem;
  theme: PluginScreenProps["theme"];
  layout: PluginScreenProps["layout"];
  onBack: () => void;
};
export function ArticleView({ item, theme, layout, onBack }: Props) {
  const toast = useToast();
  const paseo = usePaseo();
  const article = useRpc(articleRpc);
  const queryClient = useQueryClient();
  const settings = useSettings(lanternStateSettings);
  const translateRequest = useRpc(translateRequestRpc);
  const translateStatus = useRpc(translateStatusRpc);
  const [version, setVersion] = useState<ArticleVersion>("original");
  const [companion, setCompanion] = useState({
    open: false,
    prompt: "",
    agentId: null as string | null,
    agentTitle: null as string | null,
    loading: false,
    sending: false,
    error: null as string | null,
  });
  const [translating, setTranslating] = useState(false);
  const [translateSteps, setTranslateSteps] = useState({ done: 0, total: 0 });
  const [translateError, setTranslateError] = useState("");
  const lanternState = settings.status === "ready" ? settings.values : EMPTY_STATE;
  const starKey = itemKey(item);
  const starred = lanternState.star.some((entry) => itemKey(entry) === starKey);

  function toggleStar(): void {
    if (settings.status !== "ready") return;
    const next = starred
      ? settings.values.star.filter((entry) => itemKey(entry) !== starKey)
      : [item, ...settings.values.star];
    void settings
      .save({ ...settings.values, star: next }, settings.revision)
      .then((ok) => {
        if (!ok) {
          toast.error("没存上，再点一次");
          return settings.reload();
        }
        toast.show(starred ? "已取消收藏" : "已收藏", { variant: "success" });
      });
  }
  const isQiaomu = item.source === "qiaomu";
  const isRss = item.source === "rss";
  const isAihot = item.source === "aihot";

  const query = useQuery({
    queryKey: ["lantern-article", item.source, item.id, version],
    queryFn: () =>
      isQiaomu
        ? article({ id: item.id, version })
        : article({
            id: item.id,
            url: item.url,
            title: item.title,
            origin: item.origin,
            publishedAt: item.publishedAt,
            summary: item.summary,
            version,
          }),
    enabled: true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  /** 译文：服务端在后台分段翻，这里每 2 秒看一次进度 */
  const statusQuery = useQuery({
    queryKey: ["lantern-translate-status", item.id],
    queryFn: () => translateStatus({ id: item.id }),
    enabled: (isRss || isAihot) && translating,
    refetchInterval: translating ? 2000 : false,
    retry: 1,
  });

  useEffect(() => {
    const status = statusQuery.data;
    if (!status || !translating) return;
    if (status.state === "working") {
      setTranslateSteps({ done: status.done, total: status.total });
      return;
    }
    setTranslating(false);
    if (status.state === "ready") {
      setTranslateError("");
      setVersion("translation");
      toast.show("译文好了", { variant: "success" });
      void queryClient.invalidateQueries({ queryKey: ["lantern-article"] });
      return;
    }
    if (status.state === "failed") {
      setTranslateError(status.error ?? "翻译失败");
    }
  }, [statusQuery.data, translating, queryClient, toast]);

  const colors = useMemo(() => palette(theme), [theme]);
  const compact = layout.compact;
  const scrollRef = useRef<ScrollView>(null);

  // 换文章或换版本时回到顶部
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [item.id, version]);

  const styles = useMemo(() => {
    const horizontal = compact ? 16 : 28;
    const paraSize = 16.5;
    return {
      screen: { flex: 1, backgroundColor: colors.paper },
      topBar: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingHorizontal: horizontal - 12,
        height: 48,
      },
      back: { width: 44, height: 44, alignItems: "center" as const, justifyContent: "center" as const },
      topChannel: {
        fontFamily: FONT.mono,
        fontSize: 11,
        letterSpacing: 2,
        color: colors.muted,
        marginRight: 12,
      },
      body: { flex: 1 },
      bodyContent: { paddingHorizontal: horizontal, paddingBottom: 40 },
      // 桌面端正文列封顶 720 并水平居中，手机端不限宽
      bodyColumn: {
        width: "100%" as const,
        maxWidth: compact ? undefined : 720,
        alignSelf: "center" as const,
        gap: 14,
      },
      // 标题与署名当成一整块，上下留同样的空白把它抬出来
      // 标题、署名、版本切换一律居中，像报刊标题那样站中轴
      head: { gap: 8, marginTop: 22, marginBottom: 22, alignItems: "center" as const },
      kickerRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 6,
      },
      kicker: {
        ...LABEL,
        fontSize: 10,
        lineHeight: 16,
        letterSpacing: 1.4,
        color: colors.muted,
        textAlign: "center" as const,
        flexShrink: 1,
      },
      title: {
        fontFamily: FONT.serif,
        fontSize: compact ? 30 : 38,
        lineHeight: compact ? 39 : 49,
        fontWeight: "700" as const,
        color: colors.ink,
        textAlign: "center" as const,
      },
      tabs: {
        flexDirection: "row" as const,
        gap: 20,
        justifyContent: "center" as const,
      },
      tab: { paddingBottom: 4 },
      tabText: {
        fontFamily: FONT.sans,
        fontSize: 14,
        letterSpacing: 1,
        color: colors.muted,
      },
      tabTextOn: {
        fontFamily: FONT.sans,
        fontSize: 14,
        letterSpacing: 1,
        color: colors.accent,
        fontWeight: "600" as const,
      },
      tabUnderline: { height: 2, marginTop: 4, backgroundColor: "transparent" },
      tabUnderlineOn: { height: 2, marginTop: 4, backgroundColor: colors.accent },
      para: {
        fontFamily: FONT.serif,
        fontSize: paraSize,
        lineHeight: Math.round(paraSize * 1.75),
        color: colors.inkSoft,
      },
      heading: {
        fontFamily: FONT.serif,
        fontWeight: "700" as const,
        color: colors.ink,
        marginTop: 18,
      },
      quote: {
        borderLeftWidth: 2,
        borderLeftColor: colors.accent,
        paddingLeft: 12,
        marginTop: 14,
      },
      listRow: { flexDirection: "row" as const, gap: 8, marginTop: 6 },
      listMarker: {
        fontFamily: FONT.mono,
        fontSize: 13,
        lineHeight: 26,
        color: colors.accent,
        minWidth: 18,
      },
      listText: { flex: 1 },
      code: {
        fontFamily: FONT.mono,
        fontSize: 13,
        lineHeight: 20,
        color: colors.ink,
        backgroundColor: colors.panel,
        borderWidth: 1,
        borderColor: colors.rule,
        padding: 10,
        marginTop: 14,
      },
      ruleBlock: { height: 1, backgroundColor: colors.rule, marginVertical: 20 },
      imageWrap: { marginVertical: 12, gap: 6 },
      image: {
        width: "100%" as const,
        aspectRatio: 16 / 9,
        borderRadius: 4,
        backgroundColor: colors.panel,
      },
      imageAlt: { color: colors.muted, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 0.5 },
      tableWrap: { marginVertical: 12 },
      table: { borderWidth: 1, borderColor: colors.rule },
      tableRow: { flexDirection: "row" as const },
      tableRowDivider: { borderTopWidth: 1, borderTopColor: colors.rule },
      tableCell: { width: 90, padding: 6 },
      tableCellText: {
        fontFamily: FONT.sans,
        fontSize: 13,
        lineHeight: 19,
        color: colors.inkSoft,
      },
      tableHeaderText: { fontWeight: "700" as const, color: colors.ink },
      note: {
        fontFamily: FONT.sans,
        color: colors.muted,
        fontSize: 13,
        lineHeight: 20,
      },
      noteStrong: { color: colors.ink, fontSize: 13.5 },
      bottom: {
        backgroundColor: colors.paper,
        paddingHorizontal: horizontal,
        paddingVertical: 10,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
      },
      companion: {
        flex: 1,
        height: 46,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderWidth: 1,
        borderColor: colors.ink,
        backgroundColor: "transparent",
      },
      companionText: {
        fontFamily: FONT.sans,
        fontSize: 14,
        letterSpacing: 1,
        color: colors.ink,
      },
      iconButton: {
        width: 46,
        height: 46,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        borderWidth: 1,
        borderColor: colors.rule,
        backgroundColor: "transparent",
      },
      starGlyph: { fontSize: 19, lineHeight: 23, color: colors.ink },
      starGlyphOn: { fontSize: 19, lineHeight: 23, color: colors.accent },
      dialog: { gap: 12 },
      dialogHint: {
        fontFamily: FONT.sans,
        fontSize: 12,
        lineHeight: 18,
        color: colors.muted,
      },
      preview: {
        borderWidth: 1,
        borderColor: colors.rule,
        backgroundColor: colors.panel,
        padding: 12,
      },
      previewText: {
        fontFamily: FONT.sans,
        color: colors.inkSoft,
        fontSize: 13.5,
        lineHeight: 21.6,
      },
      dialogActions: { flexDirection: "row" as const, gap: 10, justifyContent: "flex-end" as const },
      cancel: {
        minHeight: 44,
        paddingHorizontal: 18,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.rule,
        backgroundColor: "transparent",
      },
      cancelText: {
        fontFamily: FONT.sans,
        fontSize: 14,
        letterSpacing: 1,
        color: colors.ink,
      },
      send: {
        minHeight: 44,
        minWidth: 92,
        paddingHorizontal: 24,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.accent,
        backgroundColor: colors.accent,
      },
      sendText: {
        fontFamily: FONT.sans,
        fontSize: 14,
        fontWeight: "600" as const,
        letterSpacing: 1,
        color: colors.paper,
      },
    };
  }, [colors, compact]);

  async function openCompanion() {
    const prompt = buildCompanionPrompt(item);
    setCompanion({
      open: true,
      prompt,
      agentId: null,
      agentTitle: null,
      loading: true,
      sending: false,
      error: null,
    });
    try {
      const result = await paseo.agents.list({
        scope: "active",
        sort: [{ key: "updated_at", direction: "desc" }],
        page: { limit: 5 },
      });
      const first = result.entries[0];
      if (!first) {
        setCompanion((state) => ({
          ...state,
          loading: false,
          error: "没有可用的 agent。先在工作区里开一个，再回来点陪读。",
        }));
        return;
      }
      setCompanion((state) => ({
        ...state,
        loading: false,
        agentId: first.agent.id,
        agentTitle: first.agent.title ?? "未命名 agent",
      }));
    } catch (error) {
      setCompanion((state) => ({
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : "找不到可用的 agent",
      }));
    }
  }

  async function sendCompanion() {
    if (!companion.agentId) return;
    setCompanion((state) => ({ ...state, sending: true, error: null }));
    try {
      await paseo.agents.ref(companion.agentId).send(companion.prompt);
      toast.show(`已发给 ${companion.agentTitle ?? "agent"}`, { variant: "success" });
      setCompanion((state) => ({ ...state, open: false, sending: false }));
    } catch (error) {
      setCompanion((state) => ({
        ...state,
        sending: false,
        error: error instanceof Error ? error.message : "发送失败",
      }));
    }
  }

  /** 点「译文」：没译文就开翻，已有就切过去 */
  async function startTranslate() {
    if (versions.translation) {
      setVersion("translation");
      return;
    }
    setTranslateError("");
    setTranslateSteps({ done: 0, total: 0 });
    setTranslating(true);
    try {
      const started = await translateRequest({
        id: item.id,
        url: item.url,
        title: item.title,
        origin: item.origin,
        publishedAt: item.publishedAt,
        summary: item.summary,
      });
      if (started.state === "ready") {
        setTranslating(false);
        setVersion("translation");
        void queryClient.invalidateQueries({ queryKey: ["lantern-article"] });
        return;
      }
      if (started.state === "failed") {
        setTranslating(false);
        setTranslateError(started.error ?? "翻译失败");
        return;
      }
      setTranslateSteps({ done: started.done, total: started.total });
    } catch (error) {
      setTranslating(false);
      setTranslateError(error instanceof Error ? error.message : "翻译失败");
    }
  }

  /** 站点短名：新条目带 site，旧条目没有 */
  const site = (item as { site?: string | null }).site ?? null;

  const result = query.data ?? null;
  const versions = result?.versions ?? {
    original: true,
    translation: false,
    rewrite: false,
  };
  const loading = query.isPending;
  const error = query.error;
  const markdown = result?.markdown ?? null;
  const note = result?.note ?? null;
  const publishedAt = result?.publishedAt ?? item.publishedAt;
  const origin = item.origin || result?.origin || "订阅";

  /** AIHOT 和「我的订阅」的英文正文才给译文 chip；乔木自己有译文 */
  const showTranslate =
    (isRss || isAihot) && ((result?.looksEnglish ?? false) || versions.translation);
  const chips: Array<{ id: ArticleVersion; title: string }> = isQiaomu
    ? VERSION_LABELS
    : showTranslate
      ? [
          { id: "original", title: "原文" },
          {
            id: "translation",
            title: translating
              ? translateSteps.total > 0
                ? `翻译 ${translateSteps.done}/${translateSteps.total}`
                : "翻译中"
              : "译文",
          },
        ]
      : [];

  function availableVersion(id: ArticleVersion): boolean {
    if (id === "original") return versions.original;
    // AIHOT 与「我的订阅」的译文 chip 总是可点：没译文时点它就是开翻
    if (id === "translation") return isQiaomu ? versions.translation : true;
    return versions.rewrite;
  }

  /** 只留真正可用的版本；只剩「原文」时不渲染版本行 */
  const visibleChips = chips.filter((entry) => availableVersion(entry.id));

  /** 行内 token 渲染：加粗、斜体、行内代码、链接 */
  function renderTokens(tokens: InlineToken[], keyPrefix: string): ReactNode[] {
    return tokens.map((token, index) => {
      const key = `${keyPrefix}-${index}`;
      if (token.href) {
        return (
          <Text
            key={key}
            style={{ color: colors.accent, textDecorationLine: "underline" }}
            onPress={() => {
              void openExternalUrl(token.href as string).catch(() => toast.error("打不开这个链接"));
            }}
          >
            {token.text}
          </Text>
        );
      }
      if (token.code) {
        return (
          <Text key={key} style={{ fontFamily: FONT.mono, fontSize: 13.5, color: colors.ink }}>
            {token.text}
          </Text>
        );
      }
      if (token.bold) {
        return (
          <Text key={key} style={{ fontWeight: "700", color: colors.ink }}>
            {token.text}
          </Text>
        );
      }
      if (token.italic) {
        return <Text key={key} style={{ fontStyle: "italic" }}>{token.text}</Text>;
      }
      return <Text key={key}>{token.text}</Text>;
    });
  }

  /** 行内文本渲染 */
  function renderInline(text: string, keyPrefix: string): ReactNode[] {
    return renderTokens(parseInline(text), keyPrefix);
  }

  /** 正文块渲染；第一段做首字下沉 */
  function renderBlocks(blocks: Block[]): ReactNode[] {
    const out: ReactNode[] = [];
    blocks.forEach((block, index) => {
      const key = `b${index}`;
      if (block.kind === "heading") {
        const size = block.level <= 2 ? 20 : 17;
        out.push(
          <Text key={key} style={[styles.heading, { fontSize: size, lineHeight: Math.round(size * 1.4) }]}>
            {renderInline(block.text, key)}
          </Text>,
        );
        return;
      }
      if (block.kind === "quote") {
        out.push(
          <View key={key} style={styles.quote}>
            <Text style={[styles.para, { fontStyle: "italic" }]}>{renderInline(block.text, key)}</Text>
          </View>,
        );
        return;
      }
      if (block.kind === "list") {
        out.push(
          <View key={key}>
            {block.items.map((entry, itemIndex) => (
              <View key={`${key}-${itemIndex}`} style={styles.listRow}>
                <Text style={styles.listMarker}>
                  {block.ordered ? `${itemIndex + 1}.` : "·"}
                </Text>
                <Text style={[styles.para, styles.listText]}>{renderInline(entry, `${key}-${itemIndex}`)}</Text>
              </View>
            ))}
          </View>,
        );
        return;
      }
      if (block.kind === "code") {
        out.push(
          <Text key={key} style={styles.code}>
            {block.text}
          </Text>,
        );
        return;
      }
      if (block.kind === "rule") {
        out.push(<View key={key} style={styles.ruleBlock} />);
        return;
      }
      if (block.kind === "image") {
        out.push(
          <ArticleImage key={key} src={block.src} alt={block.alt} colors={colors} />,
        );
        return;
      }
      if (block.kind === "table") {
        const columns = block.header.length;
        out.push(
          <View key={key} style={styles.tableWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.table, { minWidth: columns * 90 }]}>
                {[block.header, ...block.rows].map((row, rowIndex) => (
                  <View
                    key={`${key}-r${rowIndex}`}
                    style={[styles.tableRow, rowIndex > 0 ? styles.tableRowDivider : null]}
                  >
                    {row.map((cell, cellIndex) => (
                      <View key={`${key}-${rowIndex}-${cellIndex}`} style={styles.tableCell}>
                        <Text
                          style={[
                            styles.tableCellText,
                            rowIndex === 0 ? styles.tableHeaderText : null,
                          ]}
                        >
                          {renderInline(cell, `${key}-${rowIndex}-${cellIndex}`)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>,
        );
        return;
      }
      // 正文首字不放大，保持整段整齐
      out.push(
        <Text key={key} style={styles.para}>
          {renderInline(block.text, key)}
        </Text>,
      );
    });
    return out;
  }

  const blocks = useMemo(
    () => (markdown ? parseBlocks(markdown) : []),
    [markdown],
  );
  const hasBody = blocks.length > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回列表"
          onPress={onBack}
          style={styles.back}
        >
          <Icon name="ChevronLeft" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.topChannel} numberOfLines={1}>
          {channelName(item)}
        </Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.bodyColumn}>
          <View style={styles.head}>
            <Text style={styles.title}>
              {item.title}
            </Text>

            <View style={styles.kickerRow}>
              <Text style={styles.kicker} numberOfLines={1}>
                {site ?? origin} · {formatWhen(publishedAt)}
              </Text>
            </View>
          </View>

          {visibleChips.length > 1 ? (
            <View style={styles.tabs}>
              {visibleChips.map((entry) => {
                const available = availableVersion(entry.id);
                const active = entry.id === version;
                return (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityLabel={`版本：${entry.title}`}
                    disabled={!available || (entry.id === "translation" && translating)}
                    onPress={() => {
                      if (entry.id === "translation" && !versions.translation) {
                        void startTranslate();
                        return;
                      }
                      setVersion(entry.id);
                    }}
                    style={styles.tab}
                  >
                    <Text style={active ? styles.tabTextOn : styles.tabText}>{entry.title}</Text>
                    <View style={active ? styles.tabUnderlineOn : styles.tabUnderline} />
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
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>重试</Text>
              </Pressable>
            </View>
          ) : null}

          {note && !loading ? <Text style={styles.note}>{note}</Text> : null}

          {translating ? (
            <Text style={styles.note}>
              {translateSteps.total > 0
                ? `正在翻译 ${translateSteps.done}/${translateSteps.total} 段`
                : "准备翻译"}
            </Text>
          ) : null}

          {translateError ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.noteStrong}>{translateError}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="重试翻译"
                onPress={() => void startTranslate()}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>重试</Text>
              </Pressable>
            </View>
          ) : null}

          {hasBody && !loading ? renderBlocks(blocks) : null}
          {!hasBody && !loading && !error ? <Text style={styles.note}>没有正文</Text> : null}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="AI 陪读"
          onPress={() => void openCompanion()}
          style={styles.companion}
        >
          <Text style={styles.companionText}>AI 陪读</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={starred ? "取消收藏" : "收藏"}
          onPress={toggleStar}
          style={styles.iconButton}
        >
          <Text style={starred ? styles.starGlyphOn : styles.starGlyph}>
            {starred ? "★" : "☆"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="打开原文"
          onPress={() => {
            void openExternalUrl(item.url).catch(() => toast.error("打不开这个链接"));
          }}
          style={styles.iconButton}
        >
          <Icon name="ArrowUpRight" size={18} color={colors.ink} />
        </Pressable>
      </View>

      <LanternSheet
        theme={theme}
        layout={layout}
        open={companion.open}
        title="AI 陪读"
        onClose={() => setCompanion((state) => ({ ...state, open: false }))}
      >
        <View style={styles.dialog}>
          <Text style={styles.dialogHint}>以下内容将发送给最近活跃的 agent</Text>
          <View style={styles.preview}>
            <Text style={styles.previewText}>{companion.prompt}</Text>
          </View>

          {companion.error ? <Text style={styles.noteStrong}>{companion.error}</Text> : null}

          <View style={styles.dialogActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="取消陪读"
              onPress={() => setCompanion((state) => ({ ...state, open: false }))}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="发送给这个 agent"
              disabled={!companion.agentId || companion.sending}
              onPress={() => void sendCompanion()}
              style={styles.send}
            >
              <Text style={styles.sendText} numberOfLines={1}>
                {companion.sending ? "发送中" : "发送"}
              </Text>
            </Pressable>
          </View>
        </View>
      </LanternSheet>
    </View>
  );
}
