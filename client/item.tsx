import type { PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";

export function LanternItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  return (
    <SidebarRow
      icon="Lamp"
      label="提灯"
      active={currentScreen?.screenId === "lantern"}
      onPress={() => openScreen({ screenId: "lantern" })}
    />
  );
}
