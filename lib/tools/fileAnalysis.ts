export const fileToolDef = {
  type: "function",
  name: "analyze_text_file",
  description:
    "对小型文本文件（.txt / .md）做结构化解析：行数、标题、前几段、粗略关键词。",
  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "完整文本内容，建议不超过几万字符。",
      },
    },
    required: ["content"],
  },
} as const;

export async function runFileTool(args: { content: string }) {
  const text = args.content ?? "";
  const lines = text.split(/\r?\n/);
  const lineCount = lines.length;

  const headings = lines
    .filter((l) => l.trim().startsWith("#"))
    .slice(0, 10);

  const paragraphs = text.split(/\n\s*\n/).slice(0, 3);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, count]) => ({ word, count }));

  return {
    lineCount,
    headingCount: headings.length,
    headings,
    firstParagraphs: paragraphs,
    keywords,
  };
}

