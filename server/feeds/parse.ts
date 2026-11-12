import { XMLParser } from "fast-xml-parser";

export type ParsedFeedItem = {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  summary: string | null;
};

export type ParsedFeed = {
  title: string;
  items: ParsedFeedItem[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  trimValues: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(node: Node): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node["#text"] === "string") return node["#text"];
  return "";
}

function decodeEntities(value: string): string {
  const codePoint = (input: string, radix: number): string => {
    const code = Number.parseInt(input, radix);
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
    return String.fromCodePoint(code);
  };
  return (
    value
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => codePoint(hex, 16))
      .replace(/&#(\d+);/g, (_, dec: string) => codePoint(dec, 10))
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      // &amp; 必须最后换，否则 &amp;lt; 会变成 <
      .replace(/&amp;/g, "&")
  );
}

function stripHtml(value: string): string {
  return decodeEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function toIso(value: string): string {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function atomLink(node: Node): string {
  const links = asArray(node?.link);
  for (const link of links) {
    const href = typeof link === "string" ? link : link?.["@_href"];
    const rel = typeof link === "object" ? (link?.["@_rel"] ?? "alternate") : "alternate";
    if (href && rel === "alternate") return href;
  }
  const first = links[0];
  if (typeof first === "string") return first;
  return first?.["@_href"] ?? "";
}

export function parseFeed(xml: string): ParsedFeed {
  const doc = parser.parse(xml) as Node;

  const rssChannel = doc?.rss?.channel;
  if (rssChannel) {
    const items = asArray<Node>(rssChannel.item).map((item, index) => {
      const link = textOf(item.link) || textOf(item.guid);
      return {
        id: textOf(item.guid) || link || `item-${index}`,
        title: stripHtml(textOf(item.title)) || "(无标题)",
        url: link,
        publishedAt: toIso(textOf(item.pubDate) || textOf(item["dc:date"])),
        summary: stripHtml(textOf(item.description) || textOf(item["content:encoded"])).slice(0, 400) || null,
      } satisfies ParsedFeedItem;
    });
    return { title: stripHtml(textOf(rssChannel.title)) || "未命名订阅", items };
  }

  const atomFeed = doc?.feed;
  if (atomFeed) {
    const items = asArray<Node>(atomFeed.entry).map((entry, index) => {
      const link = atomLink(entry) || textOf(entry.id);
      return {
        id: textOf(entry.id) || link || `entry-${index}`,
        title: stripHtml(textOf(entry.title)) || "(无标题)",
        url: link,
        publishedAt: toIso(textOf(entry.updated) || textOf(entry.published)),
        summary: stripHtml(textOf(entry.summary) || textOf(entry.content)).slice(0, 400) || null,
      } satisfies ParsedFeedItem;
    });
    return { title: stripHtml(textOf(atomFeed.title)) || "未命名订阅", items };
  }

  const rdf = doc?.["rdf:RDF"];
  if (rdf) {
    const items = asArray<Node>(rdf.item).map((item, index) => {
      const link = textOf(item.link);
      return {
        id: textOf(item["@_rdf:about"]) || link || `rdf-${index}`,
        title: stripHtml(textOf(item.title)) || "(无标题)",
        url: link,
        publishedAt: toIso(textOf(item["dc:date"])),
        summary: stripHtml(textOf(item.description)).slice(0, 400) || null,
      } satisfies ParsedFeedItem;
    });
    return { title: stripHtml(textOf(rdf.channel?.title)) || "未命名订阅", items };
  }

  throw new Error("这不是 RSS 或 Atom 地址");
}

export type OpmlOutline = { title: string; xmlUrl: string };

export function parseOpml(xml: string): OpmlOutline[] {
  const doc = parser.parse(xml) as Node;
  const found: OpmlOutline[] = [];

  function walk(node: Node): void {
    for (const outline of asArray<Node>(node?.outline)) {
      const xmlUrl = outline?.["@_xmlUrl"];
      if (typeof xmlUrl === "string" && xmlUrl.length > 0) {
        const title = String(outline["@_title"] ?? outline["@_text"] ?? xmlUrl);
        found.push({ title, xmlUrl });
      }
      walk(outline);
    }
  }

  walk(doc?.opml?.body);
  if (found.length === 0) throw new Error("OPML 里没有找到订阅地址");
  return found;
}

export function buildOpml(entries: Array<{ title: string; url: string }>): string {
  const escape = (value: string): string =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const lines = entries.map(
    (entry) =>
      `    <outline type="rss" text="${escape(entry.title)}" title="${escape(entry.title)}" xmlUrl="${escape(entry.url)}" />`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    "  <head>",
    "    <title>提灯订阅</title>",
    "  </head>",
    "  <body>",
    ...lines,
    "  </body>",
    "</opml>",
    "",
  ].join("\n");
}
