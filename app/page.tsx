/* eslint-disable react/jsx-no-useless-fragment */
"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim() && !fileContent) return;

    const newMsgs: Msg[] = [
      ...messages,
      { role: "user", content: input || "请帮我解读上传的文件" },
    ];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMsgs,
          fileContent,
        }),
      });

      const data = (await res.json()) as { answer?: string };

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer ?? "（没有返回内容）",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "调用 /api/agent 出错，请检查控制台或日志。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setFileContent(text);
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-10 font-sans dark:bg-black">
      <div className="w-full max-w-3xl space-y-6 rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <header className="space-y-1 border-b pb-4 dark:border-zinc-800">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Agent Loop Demo
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            支持三种工具：天气查询 · 话题延伸 · 文本文件解读（.txt / .md）。
          </p>
        </header>

        <section className="flex h-80 flex-col gap-2 overflow-y-auto rounded-md border bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          {messages.length === 0 ? (
            <div className="text-zinc-500 dark:text-zinc-500">
              可以尝试：
              <br />
              · “北京天气怎么样？”
              <br />
              · “帮我扩展一下 React 这个话题”
              <br />
              · 上传一个 .txt/.md 文件，说 “帮我解读这个文件”
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="space-y-0.5">
                <div className="text-xs font-medium text-zinc-500">
                  {m.role === "user" ? "你" : "Agent"}
                </div>
                <div
                  className={
                    m.role === "user"
                      ? "rounded-md bg-zinc-100 px-3 py-2 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                      : "rounded-md bg-zinc-900 px-3 py-2 text-zinc-50 dark:bg-zinc-700"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Agent 正在思考和调用工具…
            </div>
          )}
        </section>

        <section className="space-y-3">
          <textarea
            className="h-24 w-full resize-none rounded-md border px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900/5 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            placeholder="询问天气、让它延伸一个话题，或配合上传文件让它帮你解读…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs dark:border-zinc-700">
                <span>上传 .txt / .md</span>
                <input
                  type="file"
                  accept=".txt,.md"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {fileContent && (
                <span className="ml-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                  文件已载入
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "发送中…" : "发送"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

