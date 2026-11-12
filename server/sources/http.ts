export type JsonResponse<T> =
  | { kind: "ok"; data: T; etag: string | null }
  | { kind: "not-modified" }
  | { kind: "rate-limited"; retryAfterMs: number };

const TIMEOUT_MS = 15_000;

export type TextResponse =
  | { kind: "ok"; text: string; etag: string | null }
  | { kind: "not-modified" }
  | { kind: "rate-limited"; retryAfterMs: number };

export async function getText(url: string, etag: string | null): Promise<TextResponse> {
  const headers: Record<string, string> = {
    accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    "accept-encoding": "gzip, br",
    "user-agent": "paseo-lantern/0.1 (+https://paseo.sh)",
  };
  if (etag) headers["if-none-match"] = etag;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (response.status === 304) return { kind: "not-modified" };
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "60");
      const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
      return { kind: "rate-limited", retryAfterMs: seconds * 1000 };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`);
    const text = await response.text();
    return { kind: "ok", text, etag: response.headers.get("etag") };
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson<T>(
  url: string,
  etag: string | null,
): Promise<JsonResponse<T>> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "accept-encoding": "gzip, br",
    "user-agent": "paseo-lantern/0.1 (+https://paseo.sh)",
  };
  if (etag) headers["if-none-match"] = etag;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (response.status === 304) return { kind: "not-modified" };
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "60");
      const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
      return { kind: "rate-limited", retryAfterMs: seconds * 1000 };
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`);
    }
    const data = (await response.json()) as T;
    return { kind: "ok", data, etag: response.headers.get("etag") };
  } finally {
    clearTimeout(timer);
  }
}
