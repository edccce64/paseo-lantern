import type { PluginServerContext } from "@getpaseo/plugin/server";
import { checkPing } from "./server/ping";
import { pingRpc } from "./shared/ping";

export default function contribute(server: PluginServerContext) {
  server.handle(pingRpc, checkPing);
  return () => {};
}
