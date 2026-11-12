const CJK_CHAR = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g;
const LATIN_CHAR = /[A-Za-z]/g;

/**
 * 判断正文是不是以英文为主。
 * 判据：拉丁字母不少于 300 个，且中文字符占（中文 + 拉丁）不到 5%。
 * 用途：决定正文页显不显示「EDC 改写」按钮。
 */
export function isMostlyEnglish(text: string): boolean {
  if (!text) return false;
  const cjk = text.match(CJK_CHAR)?.length ?? 0;
  const latin = text.match(LATIN_CHAR)?.length ?? 0;
  if (latin < 300) return false;
  return cjk / (cjk + latin) < 0.05;
}
