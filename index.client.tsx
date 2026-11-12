import type { PluginClientContext } from "@getpaseo/plugin/client";
import { LanternItem } from "./client/item";
import { LanternScreen } from "./client/screen";

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: "lantern", title: "提灯", Component: LanternScreen });
  client.addSidebarFooterItem({ id: "lantern", title: "提灯", Component: LanternItem });
  return () => {};
}
