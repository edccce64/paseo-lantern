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
    Component: LanternPanel,
  });
  client.addSidebarHeaderItem({ id: "lantern", title: "提灯", Component: LanternItem });
  return () => {};
}
