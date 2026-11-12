/**
 * 跑 test-harness.ts 的包装脚本。
 * tsconfig.test.json 用 noCheck 只求产物，不求类型；类型检查用 npm run typecheck。
 * 用法：npm run verify:rewrite
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");

const build = spawnSync(process.execPath, [tsc, "-p", "tsconfig.test.json"], {
  stdio: "inherit",
  cwd: root,
});
if (build.status !== 0) process.exit(build.status ?? 1);

const run = spawnSync(process.execPath, [".test-build/test-harness.js"], {
  stdio: "inherit",
  cwd: root,
});
process.exitCode = run.status ?? 1;
