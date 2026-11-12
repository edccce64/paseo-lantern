import type { PluginServerContext } from "@getpaseo/plugin/server";
import { listFeed } from "./server/feed";
import { checkPing } from "./server/ping";
import { listRpc } from "./shared/feed";
import { pingRpc } from "./shared/ping";

export default function contribute(server: PluginServerContext) {
  server.handle(pingRpc, checkPing);
  server.handle(listRpc, listFeed);
  return () => {};
}
