export function Sidebar() {
  return (
    <section className='space-y-5 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.1)] backdrop-blur-sm lg:sticky lg:top-10 lg:w-80 lg:flex-none'>
      <div className='space-y-2'>
        <div className='inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700'>
          <span className='mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500' />
          wujinhjun-agent loop
        </div>
        <h1 className='text-xl font-semibold tracking-tight'>轻量级多工具 AI 助手</h1>
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
  );
}

