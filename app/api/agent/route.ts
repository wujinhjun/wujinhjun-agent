import { NextResponse } from 'next/server';
import { runAgent, type ChatMessage } from '@/lib/agent';

export async function POST(request: Request) {
  const body = await request.json();

  const { messages, fileContent } = body as {
    messages: { role: string; content: string }[];
    fileContent?: string;
  };

   if (fileContent && fileContent.length > 100 * 1024) {
    return NextResponse.json({
      answer:
        '上传的文本内容超过 100KB，目前仅支持不超过 100KB 的 .txt / .md 文件，请裁剪内容后重新上传。',
    });
  }

  const baseMessages: ChatMessage[] = messages.map((m) => ({
    role: m.role as ChatMessage['role'],
    content: m.content,
  }));

  const enrichedMessages = [...baseMessages];

  if (fileContent) {
    enrichedMessages.push({
      role: 'user',
      content:
        '下面是用户上传的文本文件内容，请视情况调用 analyze_text_file 工具进行解析。\n\n' +
        fileContent,
    });
  }

  const result = await runAgent(enrichedMessages);

  return NextResponse.json(result);
}
