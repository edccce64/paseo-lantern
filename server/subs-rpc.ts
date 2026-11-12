import type { RpcInput } from "@getpaseo/plugin";
import {
  type subsAddRpc,
  type subsExportRpc,
  type subsImportRpc,
  type subsListRpc,
  type subsRemoveRpc,
  type subsRenameRpc,
} from "../shared/subs";
import { addSub, exportSubs, importSubs, readSubs, removeSub, renameSub } from "./subs";

export async function listSubs(_input: RpcInput<typeof subsListRpc>) {
  return { items: await readSubs() };
}

export async function addSubscription({ url }: RpcInput<typeof subsAddRpc>) {
  return { item: await addSub(url) };
}

export async function removeSubscription({ id }: RpcInput<typeof subsRemoveRpc>) {
  return { ok: await removeSub(id) };
}

export async function renameSubscription({ id, title }: RpcInput<typeof subsRenameRpc>) {
  return { item: await renameSub(id, title) };
}

export async function importSubscriptions({ opml }: RpcInput<typeof subsImportRpc>) {
  return importSubs(opml);
}

export async function exportSubscriptions(_input: RpcInput<typeof subsExportRpc>) {
  return { opml: await exportSubs() };
}
