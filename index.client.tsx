import type { PluginClientContext } from "@getpaseo/plugin/client";
import { LanternItem } from "./client/item";
import { LanternPanel } from "./client/panel";
import { LanternScreen } from "./client/screen";

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: "lantern", title: "提灯", Component: LanternScreen });
  client.addWorkspacePanel({
    id: "lantern",
    title: "提灯",
    icon: "Lamp",
    context: "workspace",
    Component: LanternPanel,
  });
  client.addCommandCenterItem({
    id: "lantern-panel",
    title: "打开提灯面板",
    icon: "Lamp",
    context: "workspace",
    onSelect({ openPanel }) {
      openPanel("lantern");
    },
  });
  client.addSidebarHeaderItem({ id: "lantern", title: "提灯", Component: LanternItem });
  return () => {};
}
