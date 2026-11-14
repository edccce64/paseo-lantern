import { Platform } from "react-native";
import type { PluginTheme } from "@getpaseo/plugin";

/**
 * B 版「日报」设计令牌。
 * 纸色在宿主深色模式下要反相，否则夜里会刺眼。
 */

export type Palette = {
  /** 页面底色 */
  paper: string;
  /** 卡片 / 抬起的面 */
  panel: string;
  /** 正文墨色 */
  ink: string;
  /** 次级正文 */
  inkSoft: string;
  /** 辅助信息 */
  muted: string;
  /** 分隔线 */
  rule: string;
  /** 强调色 */
  accent: string;
};

function luminance(hex: string): number {
  const clean = hex.replace("#", "").trim();
  if (clean.length < 6) return 1;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 宿主是深色还是浅色，用 surface0 的亮度判断 */
export function isDark(theme: PluginTheme): boolean {
  return luminance(theme.colors.surface0) < 0.5;
}

export function palette(theme: PluginTheme): Palette {
  if (isDark(theme)) {
    return {
      paper: "#15140F",
      panel: "#1E1C15",
      ink: "#EDE6D6",
      inkSoft: "#C6BDA9",
      muted: "#8E8676",
      rule: "#38342A",
      accent: "#E2793C",
    };
  }
  return {
    paper: "#F4EFE4",
    panel: "#EFE8D8",
    ink: "#1B1917",
    inkSoft: "#4A443A",
    muted: "#8A7F6C",
    rule: "#C9BFA9",
    accent: "#B4501E",
  };
}

export const FONT = {
  /** 衬线：报名、标题、正文 */
  serif: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia, 'Songti SC', SimSun, serif",
  }),
  /** 无衬线：说明文字、按钮 */
  sans: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "system-ui, -apple-system, 'Microsoft YaHei', sans-serif",
  }),
  /** 等宽：卷号、标签、小字 */
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "ui-monospace, Consolas, monospace",
  }),
} as const;

/** 小型大写标签的排版，卷号与 kicker 用 */
export const LABEL = {
  fontFamily: FONT.mono,
  fontSize: 10,
  letterSpacing: 2,
} as const;

/** 栏目标题 */
export const SECTION = {
  fontFamily: FONT.mono,
  fontSize: 12,
  letterSpacing: 1.4,
} as const;
