import { listMine } from "./mine";
import { readSubs } from "./subs";

/** 后台刷新个人订阅：15 分钟一轮，和前台懒加载共用同一份缓存 */
const INTERVAL_MS = 15 * 60 * 1000;
/** 插件启动后先等一分钟，别和首屏请求抢带宽 */
const WARMUP_MS = 60 * 1000;
/** 一次拉满，写缓存时按源各存各的，不影响前台 limit */
const FETCH_LIMIT = 200;

/**
 * 常驻刷新。没有订阅源时什么也不做。
 * 返回停止函数，插件卸载时调用。
 */
export function startBackgroundSync(): () => void {
  let running = false;

  async function tick(): Promise<void> {
    if (running) return;
    running = true;
    try {
      const subs = await readSubs();
      if (subs.length === 0) return;
      const result = await listMine(FETCH_LIMIT, false);
      console.log(
        `[lantern] background sync: ${subs.length} sources, ${result.items.length} items, ${result.state}`,
      );
    } catch (error) {
      console.warn("[lantern] background sync failed", error);
    } finally {
      running = false;
    }
  }

  const warmup = setTimeout(() => void tick(), WARMUP_MS);
  const timer = setInterval(() => void tick(), INTERVAL_MS);
  warmup.unref?.();
  timer.unref?.();
  console.log("[lantern] background sync scheduled every 15 minutes");

  return () => {
    clearTimeout(warmup);
    clearInterval(timer);
  };
}
