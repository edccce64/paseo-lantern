import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/** 连接自检：客户端确认 daemon 侧的插件子进程活着。 */
export const pingRpc = defineRpc({
  name: "lantern.ping",
  input: z.object({}),
  output: z.object({
    ok: z.boolean(),
    daemonTime: z.string(),
    pluginVersion: z.string(),
  }),
});
