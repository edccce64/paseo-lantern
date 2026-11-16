import { Platform } from "react-native";
import type { PluginTheme } from "@getpaseo/plugin";

/**
 * 设计令牌。
 * 底色跟随宿主主题：浅色是白色，深色是宿主的深色面。
 * 橙色点缀与字标是插件自己的风格，不随主题走。
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
  /** 橙色实心按钮上的文字色 */
  onAccent: string;
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
  const dark = isDark(theme);
  return {
    // 底色与卡片面都取宿主主题，浅色下就是白色
    paper: theme.colors.surface0,
    panel: theme.colors.surface1,
    ink: theme.colors.foreground,
    inkSoft: theme.colors.foreground,
    muted: theme.colors.foregroundMuted,
    rule: theme.colors.border,
    // 橙色点缀与字标是插件自己的风格，不随主题走
    accent: dark ? "#E2793C" : "#B4501E",
    onAccent: dark ? "#1B1917" : "#FFFFFF",
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
