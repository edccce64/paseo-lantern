import type { FeedItem } from "../../shared/feed";

export type CleanedSourceName = {
  /** 纯站点名，例如「TechCrunch」。不可靠时为 null */
  site: string | null;
  /** 栏目名，例如「AI News & Artificial Intelligence」 */
  label: string;
};

/** 站点名最长 32 个字符，超了当作不可靠 */
const MAX_SITE_LENGTH = 32;
/** 用「 - 」分隔时，后半段最长 24 个字符才采信 */
const MAX_DASH_SITE_LENGTH = 24;

/** 去掉末尾括号里的作者句柄：「Rohan Paul (@rohanpaul_ai)」→「Rohan Paul」 */
function stripHandle(text: string): string {
  const next = text.replace(/\s*[（(][^（()）]{1,24}[）)]\s*$/, "").trim();
  return next.length >= 2 ? next : text;
}

/**
 * 把原始来源标题清洗成站点名与栏目名。
 * 规则按优先级：
 * 1. 有「 | 」分隔时，取最后一段作站点名，前面的部分作栏目名。
 *    例：「AI News & Artificial Intelligence | TechCrunch」→ TechCrunch
 * 2. 站点名超过 32 个字符时不可靠，站点名返回 null。
 * 3. 有「 - 」分隔且后半段不超过 24 个字符时，同样取最后一段作站点名。
 * 4. 有冒号分隔时，前段作站点名；前段只有 1–2 个字符时（如「X」）
 *    当作平台前缀，站点名返回 null，栏目名取后段并去掉作者句柄。
 *    例：「TechCrunch: AI（RSS）」→ TechCrunch
 * 5. 没有可识别分隔符时，站点名返回 null，栏目名原样返回。
 */
export function cleanSourceName(raw: string): CleanedSourceName {
  const text = (raw ?? "").trim();
  if (!text) return { site: null, label: "" };

  const pipeParts = text.split(/\s+\|\s*/);
  if (pipeParts.length >= 2) {
    const site = pipeParts[pipeParts.length - 1].trim();
    const label = pipeParts.slice(0, -1).join(" | ").trim();
    return {
      site: site.length > 0 && site.length <= MAX_SITE_LENGTH ? site : null,
      label: label.length > 0 ? label : text,
    };
  }

  const dashParts = text.split(/\s+-\s+/);
  if (dashParts.length >= 2) {
    const site = dashParts[dashParts.length - 1].trim();
    if (site.length > 0 && site.length <= MAX_DASH_SITE_LENGTH) {
      const label = dashParts.slice(0, -1).join(" - ").trim();
      return { site, label: label.length > 0 ? label : text };
    }
  }

  const colon = /^(.{1,32}?)[：:]\s*(.+)$/.exec(text);
  if (colon) {
    const head = colon[1].trim();
    const rest = stripHandle(colon[2].trim());
    // 前段只有一两个字符时是平台前缀（X、微博），不把平台名当站点名
    if (head.length <= 2) return { site: null, label: rest.length > 0 ? rest : text };
    return {
      site: head.length <= MAX_SITE_LENGTH ? head : null,
      label: rest.length > 0 ? rest : head,
    };
  }

  return { site: null, label: text };
}

/**
 * 条目显示用的来源名：站点名优先，没有站点名就用栏目名。
 */
export function displaySourceName(origin: string): string {
  const { site, label } = cleanSourceName(origin);
  return site ?? label;
}

/**
 * 给旧条目补 site 字段，并把 origin 换成短来源名。
 * 旧缓存里的条目没有 site 字段，读出后补齐再写回缓存。
 * 返回是否有改动。
 */
export function backfillSourceNames(items: FeedItem[]): { items: FeedItem[]; changed: boolean } {
  let changed = false;
  const next = items.map((item) => {
    if (item.site !== undefined) return item;
    changed = true;
    const { site, label } = cleanSourceName(item.origin);
    return { ...item, origin: site ?? label, site };
  });
  return { items: next, changed };
}
