import type { RpcInput } from "@getpaseo/plugin";
import type { ListResult } from "../shared/feed";
import { listRpc } from "../shared/feed";
import { listMine } from "./mine";
import { fetchAihot } from "./sources/aihot";
import { fetchQiaomu } from "./sources/qiaomu";

export async function listFeed({
  channel,
  limit,
  force,
}: RpcInput<typeof listRpc>): Promise<ListResult> {
  const size = limit ?? 60;
  const result =
    channel === "mine"
      ? await listMine(size, force === true)
      : channel === "qiaomu"
        ? await fetchQiaomu(size, force === true)
        : await fetchAihot(channel, size, force === true);

  return {
    items: result.items,
    fetchedAt: new Date(result.fetchedAt).toISOString(),
    state: result.state,
  };
}
