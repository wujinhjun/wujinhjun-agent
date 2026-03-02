import type { ChatMsg } from '../../lib/chatTypes';
import { renderMarkdownToHtml } from '../../lib/markdown';

type Props = {
  messages: ChatMsg[];
  initializing: boolean;
  loading: boolean;
};

export function ChatMessages({ messages, initializing, loading }: Props) {
  return (
    <section className='flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm'>
      {messages.length === 0 && !initializing ? (
        <div className='text-xs text-slate-500'>
          暂时还没有对话，可以在左侧看提示，或者直接在下方输入问题开始一轮对话。
        </div>
      ) : (
        messages.map((m, i) => (
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
        <div className='text-[11px] text-slate-500'>正在从本地存储加载历史对话…</div>
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

