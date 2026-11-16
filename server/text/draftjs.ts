/**
 * X Article 的正文是 draft-js 结构（blocks + entityMap）。
 * 这里把它转成 Markdown，提灯客户端已有 Markdown 渲染管线可直接显示。
 */

type Range = { offset: number; length: number };

type InlineStyleRange = Range & { style?: string };

type EntityRange = Range & { key?: number };

type Block = {
  type?: string;
  text?: string;
  depth?: number;
  inlineStyleRanges?: InlineStyleRange[];
  entityRanges?: EntityRange[];
};

type Entity = {
  key?: string;
  /** draft-js 的 entityMap 每项都是 { key, value: { type, data, mutability } } */
  value?: {
    type?: string;
    data?: {
      url?: string;
      markdown?: string;
      mediaItems?: { mediaId?: string | number }[];
    };
  };
};

type EntityMap = Record<string, Entity>;

type MediaEntity = {
  media_id?: string | number;
  media_info?: { original_img_url?: string };
};

function headerLevel(type: string): number {
  const match = /^header-(one|two|three|four|five|six)$/.exec(type);
  if (!match) return 0;
  const names = ["one", "two", "three", "four", "five", "six"];
  return names.indexOf(match[1]) + 1;
}

/** 把一段文字按样式区间切开，逐段套上 Markdown 标记 */
function renderInline(block: Block, entityMap: EntityMap): string {
  const text = block.text ?? "";
  if (!text) return "";

  const styleRanges = (block.inlineStyleRanges ?? []).filter((r) => r.style);
  const entityRanges = block.entityRanges ?? [];

  // 切点：所有区间的起点与终点
  const points = new Set<number>([0, text.length]);
  for (const range of [...styleRanges, ...entityRanges]) {
    points.add(Math.max(0, Math.min(text.length, range.offset)));
    points.add(Math.max(0, Math.min(text.length, range.offset + range.length)));
  }
  const sorted = [...points].sort((a, b) => a - b);

  let out = "";
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (end <= start) continue;
    let piece = text.slice(start, end);
    if (!piece) continue;

    for (const range of styleRanges) {
      if (range.offset <= start && range.offset + range.length >= end) {
        const style = range.style?.toLowerCase();
        if (style === "bold") piece = `**${piece}**`;
        else if (style === "italic") piece = `*${piece}*`;
        else if (style === "code") piece = `\`${piece}\``;
      }
    }

    for (const range of entityRanges) {
      if (range.offset > start || range.offset + range.length < end) continue;
      const entity = entityMap[String(range.key)]?.value;
      const type = entity?.type?.toUpperCase();
      if (type === "LINK" && entity?.data?.url) {
        piece = `[${piece}](${entity.data.url})`;
      }
    }

    out += piece;
  }
  return out;
}

/** 图片与代码块这类 atomic 块：内容在 entityMap 里 */
function renderAtomic(block: Block, entityMap: EntityMap, mediaUrls: Map<string, string>): string {
  const range = (block.entityRanges ?? [])[0];
  if (!range) return "";
  const entity = entityMap[String(range.key)]?.value;
  const type = entity?.type?.toUpperCase();

  if (type === "MARKDOWN" && entity?.data?.markdown) {
    return entity.data.markdown.trim();
  }

  if (type === "MEDIA") {
    const mediaId = entity?.data?.mediaItems?.[0]?.mediaId;
    if (mediaId === undefined || mediaId === null) return "";
    const url = mediaUrls.get(mediaKey(mediaId));
    return url ? `![](${url})` : "";
  }

  return "";
}

function renderBlock(block: Block, entityMap: EntityMap, mediaUrls: Map<string, string>): string {
  const type = block.type ?? "unstyled";

  if (type === "atomic") {
    return renderAtomic(block, entityMap, mediaUrls);
  }

  if (type === "code-block") {
    const code = (block.text ?? "").trimEnd();
    return code ? `\`\`\`\n${code}\n\`\`\`` : "";
  }

  const inline = renderInline(block, entityMap);
  if (!inline.trim()) return "";

  const level = headerLevel(type);
  if (level > 0) return `${"#".repeat(level)} ${inline}`;

  if (type === "blockquote") {
    return inline
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }

  if (type === "unordered-list-item" || type === "ordered-list-item") {
    const indent = "  ".repeat(Math.max(0, (block.depth ?? 1) - 1));
    const marker = type === "ordered-list-item" ? "1." : "-";
    return `${indent}${marker} ${inline}`;
  }

  return inline;
}

/**
 * media_id 在 JSON 里是 19 位数字，超过 JS 的安全整数范围。
 * entityMap 里的 mediaId 已经被截断过，只能用前 16 位来配对。
 */
function mediaKey(id: string | number): string {
  return String(id).slice(0, 16);
}

/** X Article 对象 → Markdown */
export function articleToMarkdown(article: {
  content?: { blocks?: Block[]; entityMap?: EntityMap };
  media_entities?: MediaEntity[];
}): string {
  const blocks = article.content?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return "";

  const entityMap = article.content?.entityMap ?? {};
  const mediaUrls = new Map<string, string>();
  for (const media of article.media_entities ?? []) {
    const id = media?.media_id;
    const url = media?.media_info?.original_img_url;
    if (id !== undefined && id !== null && url) mediaUrls.set(mediaKey(id), url);
  }

  const parts: string[] = [];
  for (const block of blocks) {
    const rendered = renderBlock(block, entityMap, mediaUrls);
    if (rendered) parts.push(rendered);
  }
  return parts.join("\n\n").trim();
}
