import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { LanternSurface } from "./screen";

/** 桌面工作区的分屏面板：和 agent 并排看同一份界面。 */
export function LanternPanel({ theme, layout }: PluginWorkspacePanelProps) {
  return <LanternSurface theme={theme} layout={layout} />;
}
