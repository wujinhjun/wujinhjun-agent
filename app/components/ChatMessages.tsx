import { useState } from 'react';
import type { ChatMsg } from '../../lib/chatTypes';
import { renderMarkdownToHtml } from '../../lib/markdown';

type Props = {
  messages: ChatMsg[];
  initializing: boolean;
  loading: boolean;
};

export function ChatMessages({ messages, initializing, loading }: Props) {
  // 为了避免消息过多导致 DOM 过大，这里只展示最近的 N 条
  const MAX_MESSAGES = 20;
  const [showAll, setShowAll] = useState(false);

  const hasMore = messages.length > MAX_MESSAGES;
  const visibleMessages =
    showAll || !hasMore
      ? messages
      : messages.slice(messages.length - MAX_MESSAGES);

  return (
    <section className='flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm'>
      {hasMore && (
        <div className='mb-1 flex justify-center'>
          <button
            type='button'
            className='rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-200'
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll
              ? `只看最近 ${MAX_MESSAGES} 条`
              : `查看更早的 ${messages.length - MAX_MESSAGES} 条消息`}
          </button>
        </div>
      )}
      {visibleMessages.length === 0 && !initializing ? (
        <div className='text-xs text-slate-500'>
          暂时还没有对话，可以在左侧看提示，或者直接在下方输入问题开始一轮对话。
        </div>
      ) : (
        visibleMessages.map((m, i) => (
          <div key={i} className='space-y-0.5'>
            <div className='text-[11px] font-medium text-slate-500'>
              {m.role === 'user' ? '你' : 'Agent'}
            </div>
            {m.role === 'user' ? (
              <div className='inline-block max-w-full whitespace-pre-wrap rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm'>
                {m.content}
              </div>
            ) : (
              <div
                className='inline-block max-w-full rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-sm'
                // 只对 Agent 输出做简单 markdown 渲染
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownToHtml(m.content),
                }}
              />
            )}
          </div>
        ))
      )}
      {initializing && (
        <div className='text-[11px] text-slate-500'>
          正在从本地存储加载历史对话…
        </div>
      )}
      {loading && (
        <div className='flex items-center gap-2 text-[11px] text-slate-500'>
          <span className='h-3 w-3 animate-spin rounded-full border-[1.5px] border-emerald-500 border-t-transparent' />
          <span>Agent 正在思考和调用工具…</span>
        </div>
      )}
    </section>
  );
}
