/**
 * EDC 改写提示词。
 * 产物定位是「乔木改写」的同类：中文重写，不是逐句直译。
 * 关键约束是「写进文件」：0.15.4 读不到 agent 的聊天回复，只认文件。
 */
export function buildRewritePrompt(input: {
  title: string;
  origin: string;
  url: string;
  srcPath: string;
  outPath: string;
  chars: number;
}): string {
  const lines = [
    "把源文件里的英文文章改写成一篇中文稿。这是给我读的中文稿，不是逐句直译。",
    "",
    "写法：",
    "- 先讲清这件事是什么、为什么重要，再展开细节。",
    "- 开头一段钩子，接着给判断，再用 ## 小标题分块。",
    "- 句子短，删掉营销话术和重复表述。",
    "- 术语、产品名、人名保留英文原词；原文里的链接保留。",
    "- 事实、数字、时间不要改。原文没说的地方不要补。",
    "- 不要写一级标题，小节用 ##。",
    "",
    "交付：",
    `- 结果必须写进这个文件：${input.outPath}`,
    "- 只回复聊天不算完成，没写出文件我就读不到。",
    `- 不要改动源文件：${input.srcPath}`,
    "",
    `标题：${input.title}`,
    `来源：${input.origin}`,
    `链接：${input.url}`,
    `源文件长度：约 ${input.chars} 字符`,
  ];

  return `${lines.join("\n")}\n`;
}
