import OpenAI from 'openai';
import { runWeatherTool, weatherToolDef } from '@/lib/tools/weather';
import { runWikipediaTool, wikipediaToolDef } from '@/lib/tools/wikipedia';
import { runFileTool, fileToolDef } from '@/lib/tools/fileAnalysis';

const client = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

type ChatCompletionMessageParam =
  OpenAI.Chat.Completions.ChatCompletionMessageParam;
type ChatCompletionTool = OpenAI.Chat.Completions.ChatCompletionTool;

// 将我们自己定义的 tool schema 转成 Chat Completions 需要的格式
const toolsForDeepseek: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: weatherToolDef.name,
      description: weatherToolDef.description,
      parameters: weatherToolDef.parameters,
    },
  },
  {
    type: 'function',
    function: {
      name: wikipediaToolDef.name,
      description: wikipediaToolDef.description,
      parameters: wikipediaToolDef.parameters,
    },
  },
  {
    type: 'function',
    function: {
      name: fileToolDef.name,
      description: fileToolDef.description,
      parameters: fileToolDef.parameters,
    },
  },
];

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export async function runAgent(messages: ChatMessage[]) {
  // 加一个 system 提示，限制工具调用次数，鼓励尽快给出总结
  const chatMessages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        '你是一个多工具 Agent，拥有 get_weather、extend_topic、analyze_text_file 三个函数工具。' +
        '在需要时可以调用它们，但请尽量减少调用次数，最多进行两到三轮工具调用。' +
        '拿到工具结果后，要直接用自然语言向用户总结回答，避免重复调用同一个工具陷入循环。',
    },
    ...messages.map<ChatCompletionMessageParam>((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  // 最多三轮工具调用，避免死循环
  for (let round = 0; round < 3; round += 1) {
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: chatMessages,
      tools: toolsForDeepseek,
      tool_choice: 'auto',
    });

    const message = completion.choices[0]?.message;

    // 没有工具调用，直接返回内容
    if (!message?.tool_calls || message.tool_calls.length === 0) {
      return { answer: message.content ?? '' };
    }

    // 先把这条带 tool_calls 的 assistant 消息放进对话历史
    chatMessages.push(message);

    // 顺序执行每个工具，并把结果作为 tool 消息追加
    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function.name as string;
      const args = JSON.parse(toolCall.function.arguments || '{}');

      let result: unknown;
      if (toolName === 'get_weather') {
        result = await runWeatherTool(args);
      } else if (toolName === 'extend_topic') {
        result = await runWikipediaTool(args);
      } else if (toolName === 'analyze_text_file') {
        result = await runFileTool(args);
      } else {
        result = { error: `未知工具：${toolName}` };
      }

      chatMessages.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      });
    }
  }

  return { answer: '工具调用轮次过多，已停止。可以换一种问法再试试。' };
}
