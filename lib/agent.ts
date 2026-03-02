import OpenAI from 'openai';
import {
  runWeatherTool,
  weatherToolDef,
  type WeatherToolResult,
} from '@/lib/tools/weather';
import { runWikipediaTool, wikipediaToolDef } from '@/lib/tools/wikipedia';
import { runFileTool, fileToolDef } from '@/lib/tools/fileAnalysis';

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

export type DeepseekConfig = {
  baseURL: string;
  apiKey: string;
};

export async function runAgent(
  messages: ChatMessage[],
  config?: DeepseekConfig,
) {
  // 加一个 system 提示，限制工具调用次数，鼓励尽快给出总结
  const chatMessages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        '你是一个多工具 Agent，拥有 get_weather、extend_topic、analyze_text_file 三个函数工具。' +
        '在需要时可以调用它们，但请尽量减少调用次数，最多进行两到三轮工具调用。' +
        '拿到工具结果后，要直接用自然语言向用户总结回答，避免重复调用同一个工具陷入循环。' +
        '当用户询问天气时，请使用简洁的中文 Markdown 列表输出，格式示例：\\n' +
        '「北京当前天气：\\n- 时间：...\\n- 温度：...℃\\n- 风：... km/h，...风\\n- 天气：多云/晴等\\n- 建议：一句简短建议」。' +
        '不要在一个长段落里堆太多加粗字段，而是用清晰的项目符号分行展示关键信息。',
    },
    ...messages.map<ChatCompletionMessageParam>((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const client = new OpenAI({
    baseURL: config?.baseURL,
    apiKey: config?.apiKey,
  });

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

    // 顺序执行每个工具
    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function.name as string;
      const args = JSON.parse(toolCall.function.arguments || '{}');

      let result: unknown;
      if (toolName === 'get_weather') {
        const weatherResult = await runWeatherTool(args);

        if ('error' in weatherResult) {
          // 让模型自己根据错误信息决定是否重试或给出友好提示
          result = weatherResult;
        } else {
          const {
            location,
            current_weather: {
              temperature,
              windspeed,
              winddirection,
              weathercode,
            },
          } = weatherResult as WeatherToolResult;

          const beijingTime = new Intl.DateTimeFormat('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date());

          const directionLabel = (() => {
            if (
              typeof winddirection !== 'number' ||
              Number.isNaN(winddirection)
            ) {
              return '风向未知';
            }
            const dirs = [
              '北',
              '东北',
              '东',
              '东南',
              '南',
              '西南',
              '西',
              '西北',
            ];
            const index = Math.round((winddirection % 360) / 45) % 8;
            return `${dirs[index]}风`;
          })();

          const weatherText = (() => {
            if (typeof weathercode !== 'number') {
              return `天气代码 ${weathercode}`;
            }

            if (weathercode === 0) return '晴';
            if ([1, 2, 3].includes(weathercode)) return '多云或阴';
            if ([45, 48].includes(weathercode)) return '有雾或雾凇';
            if ([51, 53, 55].includes(weathercode)) return '毛毛雨';
            if ([61, 63, 65, 80, 81, 82].includes(weathercode)) return '雨';
            if ([71, 73, 75, 77, 85, 86].includes(weathercode)) return '雪';
            if ([95, 96, 99].includes(weathercode)) return '雷暴';

            return `天气代码 ${weathercode}`;
          })();

          let advice = '气温适中，注意根据体感增减衣物。';
          if (typeof temperature === 'number') {
            if (temperature <= 0) {
              advice = '天气寒冷，出门请穿厚外套并注意保暖。';
            } else if (temperature <= 10) {
              advice = '天气偏冷，建议外出时适当增添外套。';
            } else if (temperature >= 28) {
              advice = '天气偏热，注意补水和防晒，避免长时间暴晒。';
            }
          }

          const lines = [
            `${location}当前天气：`,
            `- 时间（北京时间）：${beijingTime}`,
            `- 温度：${temperature}℃`,
            `- 风：${windspeed} km/h，${directionLabel}（${winddirection}°）`,
            `- 天气：${weatherText}`,
            `- 建议：${advice}`,
          ];

          return { answer: lines.join('\n') };
        }
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

export async function runAgentStream(
  messages: ChatMessage[],
  config: DeepseekConfig,
  onChunk: (text: string) => void,
) {
  const chatMessages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        '你是一个多工具 Agent，拥有 get_weather、extend_topic、analyze_text_file 三个函数工具。' +
        '在需要时可以调用它们，但请尽量减少调用次数，最多进行两到三轮工具调用。' +
        '拿到工具结果后，要直接用自然语言向用户总结回答，避免重复调用同一个工具陷入循环。' +
        '当用户询问天气时，请使用简洁的中文 Markdown 列表输出，格式示例：\\n' +
        '「北京当前天气：\\n- 时间：...\\n- 温度：...℃\\n- 风：... km/h，...风\\n- 天气：多云/晴等\\n- 建议：一句简短建议」。' +
        '不要在一个长段落里堆太多加粗字段，而是用清晰的项目符号分行展示关键信息。',
    },
    ...messages.map<ChatCompletionMessageParam>((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });

  let shouldStreamAnswer = false;

  // 最多三轮工具调用，避免死循环
  for (let round = 0; round < 3; round += 1) {
    // eslint-disable-next-line no-await-in-loop
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: chatMessages,
      tools: toolsForDeepseek,
      tool_choice: 'auto',
    });

    const message = completion.choices[0]?.message;

    // 没有工具调用，直接进入最终回答阶段
    if (!message?.tool_calls || message.tool_calls.length === 0) {
      shouldStreamAnswer = true;
      break;
    }

    // 先把这条带 tool_calls 的 assistant 消息放进对话历史
    chatMessages.push(message);

    // 顺序执行每个工具
    for (const toolCall of message.tool_calls) {
      const toolName = toolCall.function.name as string;
      const args = JSON.parse(toolCall.function.arguments || '{}');

      let result: unknown;
      if (toolName === 'get_weather') {
        const weatherResult = await runWeatherTool(args);

        if ('error' in weatherResult) {
          // 让模型自己根据错误信息决定是否重试或给出友好提示
          result = weatherResult;
        } else {
          const {
            location,
            current_weather: {
              temperature,
              windspeed,
              winddirection,
              weathercode,
            },
          } = weatherResult as WeatherToolResult;

          const beijingTime = new Intl.DateTimeFormat('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date());

          const directionLabel = (() => {
            if (
              typeof winddirection !== 'number' ||
              Number.isNaN(winddirection)
            ) {
              return '风向未知';
            }
            const dirs = [
              '北',
              '东北',
              '东',
              '东南',
              '南',
              '西南',
              '西',
              '西北',
            ];
            const index = Math.round((winddirection % 360) / 45) % 8;
            return `${dirs[index]}风`;
          })();

          const weatherText = (() => {
            if (typeof weathercode !== 'number') {
              return `天气代码 ${weathercode}`;
            }

            if (weathercode === 0) return '晴';
            if ([1, 2, 3].includes(weathercode)) return '多云或阴';
            if ([45, 48].includes(weathercode)) return '有雾或雾凇';
            if ([51, 53, 55].includes(weathercode)) return '毛毛雨';
            if ([61, 63, 65, 80, 81, 82].includes(weathercode)) return '雨';
            if ([71, 73, 75, 77, 85, 86].includes(weathercode)) return '雪';
            if ([95, 96, 99].includes(weathercode)) return '雷暴';

            return `天气代码 ${weathercode}`;
          })();

          let advice = '气温适中，注意根据体感增减衣物。';
          if (typeof temperature === 'number') {
            if (temperature <= 0) {
              advice = '天气寒冷，出门请穿厚外套并注意保暖。';
            } else if (temperature <= 10) {
              advice = '天气偏冷，建议外出时适当增添外套。';
            } else if (temperature >= 28) {
              advice = '天气偏热，注意补水和防晒，避免长时间暴晒。';
            }
          }

          const lines = [
            `${location}当前天气：`,
            `- 时间（北京时间）：${beijingTime}`,
            `- 温度：${temperature}℃`,
            `- 风：${windspeed} km/h，${directionLabel}（${winddirection}°）`,
            `- 天气：${weatherText}`,
            `- 建议：${advice}`,
          ];

          result = { answer: lines.join('\n') };
        }
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

  if (!shouldStreamAnswer) {
    onChunk('工具调用轮次过多，已停止。可以换一种问法再试试。');
    return;
  }

  // 最终回答阶段：不再提供 tools，只让模型根据对话和工具结果给出自然语言回复
  chatMessages.push({
    role: 'system',
    content:
      '你已经获得了所有必要的工具调用结果。接下来请只用自然语言直接回答用户，不要再调用任何工具。',
  });

  const stream = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: chatMessages,
    stream: true,
  });

  // 按照 OpenAI 兼容流式接口逐块推送内容
  // eslint-disable-next-line no-restricted-syntax
  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content;
    if (delta) {
      onChunk(delta);
    }
  }
}

