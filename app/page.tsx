/* eslint-disable react/jsx-no-useless-fragment */
'use client';

import { useEffect, useState } from 'react';
import { loadChatMessages, persistChatMessages } from '../lib/chatDb';
import type { ChatMsg } from '../lib/chatTypes';
import { useStreamAssistant } from '../lib/hooks/useStreamAssistant';
import { Sidebar } from './components/Sidebar';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';

const MAX_FILE_SIZE = 100 * 1024; // 100KB

type DeepseekConfig = {
  baseURL: string;
  apiKey: string;
};

const DEFAULT_CONFIG: DeepseekConfig = {
  baseURL: '',
  apiKey: '',
};

const CONFIG_STORAGE_KEY = 'wujinhjun-agent-deepseek-config';

export default function Home() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [config, setConfig] = useState<DeepseekConfig>(DEFAULT_CONFIG);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const isConfigured =
    config.baseURL.trim().length > 0 && config.apiKey.trim().length > 0;

  const canSend =
    (input.trim().length > 0 || !!fileContent) &&
    !loading &&
    !initializing &&
    isConfigured;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setInitializing(true);
      const persisted = await loadChatMessages<ChatMsg>();

      if (!cancelled && persisted.length > 0) {
        setMessages(persisted);
      }

      if (!cancelled && typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as Partial<DeepseekConfig>;
            setConfig({
              baseURL: parsed.baseURL?.trim() ?? DEFAULT_CONFIG.baseURL,
              apiKey: parsed.apiKey?.trim() ?? DEFAULT_CONFIG.apiKey,
            });
          }
        } catch {
          setConfig(DEFAULT_CONFIG);
        }
      }

      if (!cancelled) {
        setInitializing(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // 只在首次挂载时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    void persistChatMessages(messages);
  }, [messages]);

  const handleOpenConfig = () => {
    setShowConfigModal(true);
  };

  const handleCloseConfig = () => {
    setShowConfigModal(false);
  };

  const handleSaveConfig = (next: DeepseekConfig) => {
    const normalized: DeepseekConfig = {
      baseURL: next.baseURL.trim(),
      apiKey: next.apiKey.trim(),
    };
    setConfig(normalized);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          CONFIG_STORAGE_KEY,
          JSON.stringify(normalized),
        );
      } catch {
        // 本地存储失败时静默忽略
      }
    }
    setShowConfigModal(false);
  };

  const { streamAssistantFromResponse } = useStreamAssistant(setMessages);

  async function handleSend() {
    if (!input.trim() && !fileContent) return;
    if (!isConfigured) return;

    const newMsgs: ChatMsg[] = [
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
          config: {
            baseURL: config.baseURL,
            apiKey: config.apiKey || undefined,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        const safeText =
          text ||
          '调用 /api/agent 出错，请检查配置（Base URL / API Key）或服务端日志。';

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: safeText },
        ]);
        return;
      }

      await streamAssistantFromResponse(res);
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
      <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-start'>
        <Sidebar />

        <section className='flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur-sm'>
          <header className='flex items-center justify-between border-b border-slate-100 px-5 py-3'>
            <div>
              <div className='text-xs font-medium uppercase tracking-[0.16em] text-slate-500'>
                chat history
              </div>
              <p className='text-xs text-slate-500'>
                和 Agent 对话，它会按需自动调用工具。
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={handleOpenConfig}
                className='inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 shadow-sm hover:border-emerald-500/70 hover:text-emerald-600'
              >
                <span className='mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400' />
                Deepseek 设置
              </button>
              <div className='flex items-center gap-1.5 rounded-full bg-slate-900 text-slate-50 px-3 py-1 text-[11px]'>
                <span
                  className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                    !initializing && !isConfigured
                      ? 'bg-red-500'
                      : 'bg-emerald-400'
                  }`}
                />
                {initializing
                  ? '正在从本地存储加载历史对话…'
                  : !isConfigured
                    ? '待配置 Deepseek 连接…'
                    : loading
                      ? '正在思考与调用工具…'
                      : '待命中'}
              </div>
            </div>
          </header>

          <div className='flex flex-1 flex-col gap-3 p-4'>
            <ChatMessages
              messages={messages}
              initializing={initializing}
              loading={loading}
            />

            <ChatInput
              input={input}
              onChangeInput={setInput}
              onSend={handleSend}
              onFileChange={handleFileChange}
              fileError={fileError}
              fileName={fileName}
              canSend={canSend}
              loading={loading}
            />
          </div>
        </section>
      </div>
      {showConfigModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4'>
          <div className='w-full max-w-md rounded-2xl bg-white p-5 shadow-xl'>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h2 className='text-sm font-semibold text-slate-900'>
                  Deepseek 连接设置
                </h2>
                <p className='mt-1 text-xs text-slate-500'>
                  仅在本机浏览器本地保存，可覆盖默认的请求地址和 API Key。
                </p>
              </div>
              <button
                type='button'
                onClick={handleCloseConfig}
                className='text-xs text-slate-400 hover:text-slate-600'
              >
                关闭
              </button>
            </div>

            <div className='space-y-3'>
              <div className='space-y-1.5'>
                <label className='block text-xs font-medium text-slate-700'>
                  Base URL
                </label>
                <input
                  type='text'
                  value={config.baseURL}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      baseURL: e.target.value,
                    }))
                  }
                  className='w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 outline-none ring-emerald-500/0 placeholder:text-slate-400 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20'
                  placeholder='例如：https://api.deepseek.com'
                />
              </div>

              <div className='space-y-1.5'>
                <label className='block text-xs font-medium text-slate-700'>
                  API Key
                </label>
                <input
                  type='password'
                  value={config.apiKey}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      apiKey: e.target.value,
                    }))
                  }
                  className='w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 outline-none ring-emerald-500/0 placeholder:text-slate-400 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20'
                  placeholder='请配置API Key'
                />
              </div>
            </div>

            <div className='mt-5 flex items-center justify-end gap-2'>
              <button
                type='button'
                onClick={handleCloseConfig}
                className='rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400'
              >
                取消
              </button>
              <button
                type='button'
                onClick={() => handleSaveConfig(config)}
                className='rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-medium text-emerald-50 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400'
              >
                保存并生效
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
