## wujinhjun-agent

## 产品介绍

**wujinhjun-agent** 是一个基于 Next.js 的轻量级多工具 AI 助手，主打「实用、可拓展」。  
在基础对话能力之外，通过调用不同的工具（Tool）完成具体任务，目前内置：

- **天气查询**：根据城市名称查询当前天气情况和温度范围。
- **话题延伸**：围绕用户给出的主题进行延伸讲解、知识补全或灵感拓展。
- **文件上传解读**：支持上传 `.txt` / `.md` 纯文本文件，进行结构化梳理与要点总结。

后续可以方便地继续增加新的 Tool（例如翻译、代码分析等），复用统一的 Agent 框架。

## 架构介绍

- **前端界面**
  - `app/page.tsx`：主对话页面，负责消息列表展示、输入框、文件上传组件等交互。
  - 使用 `useState` / `useEffect` 管理会话状态与加载状态，并通过 `fetch('/api/agent')` 调用后端 Agent。
  - 使用 `IndexedDB` 持久化会话记录，在浏览器本地保留历史对话。

- **本地存储（IndexedDB）**
  - `lib/chatDb.ts`：封装 IndexedDB 打开、读写逻辑以及相关配置（库名、表名、主键等）。
  - 提供 `loadChatMessages` / `persistChatMessages` 两个函数供 UI 层调用，UI 不直接依赖 IndexedDB 细节。

- **Agent 核心**
  - `lib/agent.ts`：实现 Agent 主循环，负责：
    - 接收前端传来的消息历史与上下文。
    - 决策是否调用某个 Tool，以及如何组合调用结果。
    - 把最终自然语言回复返回给前端。

- **工具（Tools）层**
  - `lib/tools/weather.ts`：天气查询 Tool。
  - `lib/tools/wikipedia.ts`：维基百科检索 Tool，用于话题延伸等知识查询。
  - `lib/tools/fileAnalysis.ts`：文件内容分析 Tool，输入为上传的文本内容。

- **API 层**
  - `app/api/agent/route.ts`：Next.js Route Handler，对外暴露 `/api/agent` 接口：
    - 校验请求参数。
    - 调用 `lib/agent.ts` 执行推理与工具编排。
    - 返回最终结果给前端。

## 本地运行

```bash
pnpm install        # 或 yarn / npm install
pnpm dev            # 启动开发服务，默认 http://localhost:3000
```

启动后即可在浏览器中打开页面，直接体验对话、天气查询和文件解读等功能。
