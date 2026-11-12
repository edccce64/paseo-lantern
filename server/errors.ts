/**
 * 统一的错误文案。
 * 目的：限流、超时、连不上、对方报错这四种情况在四个数据源里说法一致，
 * 用户在不同频道看到的提示是同一套词。
 */

/** 429 的统一说法 */
export function rateLimitMessage(retryAfterMs: number): string {
  const seconds = Math.max(1, Math.round(retryAfterMs / 1000));
  return `对方限流了，约 ${seconds} 秒后再试`;
}

/** 把 fetch / http 抛出来的东西翻成一句人话 */
export function describeFetchError(error: unknown, source: string): string {
  if (!(error instanceof Error)) return `${source}出错了`;
  if (error.name === "AbortError") return `${source}超时了，网络慢或对方没响应`;

  const message = error.message;
  const status = message.match(/^HTTP (\d{3})/)?.[1];
  if (status) {
    if (status === "401" || status === "403") return `${source}拒绝了这个请求（${status}）`;
    if (status === "404") return `${source}没有这个地址（404）`;
    if (status.startsWith("5")) return `${source}出错了（${status}），稍后再试`;
    if (status.startsWith("4")) return `${source}不接受这个请求（${status}）`;
  }

  if (/fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket|network/i.test(message)) {
    return `连不上${source}，检查网络`;
  }

  return `${source}出错了：${message}`;
}
