export const wikipediaToolDef = {
  type: "function",
  name: "extend_topic",
  description:
    "根据给定话题，从 Wikipedia 获取摘要和相关条目，用于话题延伸。",
  parameters: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "话题或条目标题，比如 'React (web framework)'",
      },
      lang: {
        type: "string",
        description: "维基语言代码，如 'en'、'zh'，默认 'en'",
      },
    },
    required: ["topic"],
  },
} as const;

export async function runWikipediaTool(args: { topic: string; lang?: string }) {
  const lang = args.lang || "en";
  const title = args.topic.trim();

  const summaryRes = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title,
    )}`,
  );

  if (!summaryRes.ok) {
    return { error: "未找到该话题的 Wikipedia 条目" };
  }

  const summary = await summaryRes.json();

  const searchRes = await fetch(
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      title,
    )}&format=json`,
  );
  const search = (await searchRes.json()) as {
    query?: {
      search?: { title: string }[];
    };
  };

  const related =
    (search.query?.search || [])
      .slice(0, 5)
      .map((s) => s.title);

  return {
    title: summary.title,
    extract: summary.extract,
    url: summary.content_urls?.desktop?.page,
    related_titles: related,
  };
}

