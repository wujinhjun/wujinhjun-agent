/* eslint-disable react/jsx-no-useless-fragment */
'use client';

import { useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Home() {
  const MAX_FILE_SIZE = 100 * 1024; // 100KB

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSend = (input.trim().length > 0 || !!fileContent) && !loading;

  async function handleSend() {
    if (!input.trim() && !fileContent) return;

    const newMsgs: Msg[] = [
      ...messages,
      { role: 'user', content: input || '请帮我解读上传的文件' },
    ];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          fileContent,
        }),
      });

      const data = (await res.json()) as { answer?: string };

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer ?? '（没有返回内容）',
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '调用 /api/agent 出错，请检查控制台或日志。',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    setFileName(null);
    setFileContent(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setFileError('文件过大，请上传不超过 100KB 的 .txt 或 .md 文件。');
      e.target.value = '';
      return;
    }

    const text = await file.text();
    setFileContent(text);
    setFileName(file.name);
  }

  return (
    <main className='min-h-screen bg-linear-to-b from-slate-50 via-white to-sky-50 px-4 py-10 font-sans text-slate-900'>
      <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row'>
        <section className='space-y-5 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.1)] backdrop-blur-sm lg:w-80'>
          <div className='space-y-2'>
            <div className='inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700'>
              <span className='mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500' />
              wujinhjun-agent loop
            </div>
            <h1 className='text-xl font-semibold tracking-tight'>
              轻量级多工具 AI 助手
            </h1>
            <p className='text-sm text-slate-600'>
              一个围绕真实工具能力打造的对话界面：天气查询、话题延伸、文本文件解读，专注实用体验。
            </p>
          </div>

          <div className='space-y-3 rounded-xl border border-slate-100 bg-sky-50/80 p-3 text-xs text-slate-700'>
            <div className='font-medium text-slate-900'>可以试试这样问</div>
            <ul className='space-y-1.5'>
              <li>· 「北京天气怎么样？」</li>
              <li>· 「帮我展开聊聊 React」</li>
              <li>· 上传 .txt / .md 后说「帮我解读这个文件」</li>
            </ul>
          </div>

          <div className='space-y-1 text-[11px] text-slate-500'>
            <div>· 单个文本文件大小限制：≤ 100KB</div>
            <div>· 目前支持：.txt / .md 纯文本文件</div>
          </div>
        </section>

        <section className='flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur-sm'>
          <header className='flex items-center justify-between border-b border-slate-100 px-5 py-3'>
            <div>
              <div className='text-xs font-medium uppercase tracking-[0.16em] text-slate-500'>
                Dialogue
              </div>
              <p className='text-xs text-slate-500'>
                和 Agent 对话，它会按需自动调用工具。
              </p>
            </div>
            <div className='flex items-center gap-1.5 rounded-full bg-slate-900 text-slate-50 px-3 py-1 text-[11px]'>
              <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400' />
              {loading ? '正在思考与调用工具…' : '待命中'}
            </div>
          </header>

          <div className='flex flex-1 flex-col gap-3 p-4'>
            <section className='flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm'>
              {messages.length === 0 ? (
                <div className='text-xs text-slate-500'>
                  暂时还没有对话，可以在左侧看提示，或者直接在下方输入问题开始一轮对话。
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className='space-y-0.5'>
                    <div className='text-[11px] font-medium text-slate-500'>
                      {m.role === 'user' ? '你' : 'Agent'}
                    </div>
                    <div
                      className={
                        m.role === 'user'
                          ? 'inline-block max-w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm'
                          : 'inline-block max-w-full rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-sm'
                      }
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className='text-[11px] text-slate-500'>
                  Agent 正在整理思路和调用工具，请稍候…
                </div>
              )}
            </section>

            <section className='space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3'>
              <textarea
                className='h-24 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/0 placeholder:text-slate-400 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20'
                placeholder='可以直接提问，或者结合上传的 .txt / .md 让它帮你做结构化解读…'
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />

              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div className='space-y-1 text-[11px] text-slate-500'>
                  <label className='inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-emerald-500/70 hover:text-emerald-600'>
                    <span>上传 .txt / .md 文件</span>
                    <input
                      type='file'
                      accept='.txt,.md'
                      className='hidden'
                      onChange={handleFileChange}
                    />
                  </label>
                  <div className='flex flex-wrap items-center gap-1'>
                    {fileError && (
                      <span className='text-[11px] text-red-500'>
                        {fileError}
                      </span>
                    )}
                    {!fileError && fileName && (
                      <span className='text-[11px] text-emerald-600'>
                        {fileName} · 文件已载入
                      </span>
                    )}
                    <span className='text-[11px] text-slate-400'>
                      单文件大小 ≤ 100KB
                    </span>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={handleSend}
                  disabled={!canSend}
                  className='inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-emerald-50 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:text-emerald-800 disabled:shadow-none'
                >
                  {loading ? '发送中…' : '发送'}
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
