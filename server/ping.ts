import type { RpcInput } from "@getpaseo/plugin";
import { pingRpc } from "../shared/ping";

const PLUGIN_VERSION = "0.1.0";

export function checkPing(_input: RpcInput<typeof pingRpc>) {
  console.log(`[lantern] ping at ${new Date().toISOString()}`);
  return {
    ok: true,
    daemonTime: new Date().toISOString(),
    pluginVersion: PLUGIN_VERSION,
  };
}
