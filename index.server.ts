import type { PluginServerContext } from "@getpaseo/plugin/server";
import { getArticle } from "./server/article";
import { listFeed } from "./server/feed";
import { checkPing } from "./server/ping";
import {
  addSubscription,
  exportSubscriptions,
  importSubscriptions,
  listSubs,
  removeSubscription,
  renameSubscription,
} from "./server/subs-rpc";
import { requestRewrite, statusRewrite } from "./server/rewrite";
import { articleRpc } from "./shared/article";
import { listRpc } from "./shared/feed";
import { pingRpc } from "./shared/ping";
import { rewriteRequestRpc, rewriteStatusRpc } from "./shared/rewrite";
import {
  subsAddRpc,
  subsExportRpc,
  subsImportRpc,
  subsListRpc,
  subsRemoveRpc,
  subsRenameRpc,
} from "./shared/subs";

export default function contribute(server: PluginServerContext) {
  server.handle(pingRpc, checkPing);
  server.handle(listRpc, listFeed);
  server.handle(articleRpc, getArticle);
  server.handle(rewriteRequestRpc, requestRewrite);
  server.handle(rewriteStatusRpc, statusRewrite);
  server.handle(subsListRpc, listSubs);
  server.handle(subsAddRpc, addSubscription);
  server.handle(subsRemoveRpc, removeSubscription);
  server.handle(subsRenameRpc, renameSubscription);
  server.handle(subsImportRpc, importSubscriptions);
  server.handle(subsExportRpc, exportSubscriptions);
  return () => {};
}
