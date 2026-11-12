/**
 * 临时验证脚本，不打包。用法：
 *   npx tsc -p tsconfig.test.json && node .test-build/test-harness.js
 * 验证 EDC 改写这条链路：写源文件 → 模拟 agent 写产物 → 轮询状态 → 正文页读本地稿。
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fetchPageArticle } from "./server/page-article";
import { requestRewrite, statusRewrite } from "./server/rewrite";
import { rewritePaths } from "./server/rewrite-files";
import { isMostlyEnglish } from "./server/text/lang";
import { listMine } from "./server/mine";

const ENGLISH_SAMPLE = "The quick brown fox jumps over the lazy dog. ".repeat(20);
const CHINESE_SAMPLE = "这是一段用来验证本地中文稿是否被读到的中文正文。".repeat(8);

async function main() {
  const mine = await listMine(200, false);
  const english = mine.items.filter((item) => /^[A-Za-z0-9 ,.'"()&:!?–—-]{12,}$/.test(item.title));
  console.log(`[1] 我的订阅 ${mine.items.length} 条，标题看起来是英文的 ${english.length} 条`);
  const target = english[0] ?? mine.items[0];
  if (!target) throw new Error("订阅里没有条目");
  console.log(`    目标：${target.title.slice(0, 60)}`);
  console.log(`    id：${target.id.slice(0, 70)}`);

  const original = await fetchPageArticle({
    id: target.id,
    url: target.url,
    title: target.title,
    origin: target.origin,
    publishedAt: target.publishedAt,
    summary: target.summary,
  });
  console.log(
    `[2] 正文：${original.markdown?.length ?? 0} 字符，looksEnglish=${original.looksEnglish}，local=${original.versions.local}`,
  );

  const prepared = await requestRewrite({
    id: target.id,
    url: target.url,
    title: target.title,
    origin: target.origin,
    publishedAt: target.publishedAt,
    summary: target.summary,
  });
  const srcStat = await fs.stat(prepared.srcPath);
  console.log(`[3] 源文件已写入：${path.basename(prepared.srcPath)}，${srcStat.size} 字节`);
  console.log(`    产物路径：${path.basename(prepared.outPath)}`);

  const before = await statusRewrite({ id: target.id });
  console.log(`[4] 还没产物时 state=${before.state}`);

  // 模拟 agent 写文件
  const { outPath } = rewritePaths(target.id);
  await fs.writeFile(outPath, `# 中文稿\n\n${CHINESE_SAMPLE}\n`, "utf8");
  const fresh = await statusRewrite({ id: target.id });
  console.log(`[5] 刚写完（1.5 秒内）state=${fresh.state}（期望 pending）`);

  await new Promise((resolve) => setTimeout(resolve, 1800));
  const after = await statusRewrite({ id: target.id });
  console.log(`[6] 等 1.8 秒后 state=${after.state}，${after.chars} 字符（期望 ready）`);

  const local = await fetchPageArticle({
    id: target.id,
    url: target.url,
    title: target.title,
    origin: target.origin,
    publishedAt: target.publishedAt,
    summary: target.summary,
    version: "local",
  });
  const isLocalText = (local.markdown ?? "").includes("验证本地中文稿");
  console.log(
    `[7] 正文页 version=local：versions.local=${local.versions.local}，读到本地稿=${isLocalText}`,
  );

  const englishCheck = isMostlyEnglish(ENGLISH_SAMPLE);
  const chineseCheck = isMostlyEnglish(CHINESE_SAMPLE);
  console.log(`[8] 语种判定：英文样本=${englishCheck}，中文样本=${chineseCheck}`);

  // 清掉测试产物，避免污染真实数据
  await fs.rm(prepared.srcPath, { force: true });
  await fs.rm(outPath, { force: true });
  console.log("[9] 测试产物已清理");
}

main().catch((error) => {
  console.error("测试失败：", error);
  process.exitCode = 1;
});
