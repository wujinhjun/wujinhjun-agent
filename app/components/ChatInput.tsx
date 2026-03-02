type Props = {
  input: string;
  onChangeInput: (value: string) => void;
  onSend: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileError: string | null;
  fileName: string | null;
  canSend: boolean;
  loading: boolean;
};

export function ChatInput({
  input,
  onChangeInput,
  onSend,
  onFileChange,
  fileError,
  fileName,
  canSend,
  loading,
}: Props) {
  return (
    <section className='space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3'>
      <textarea
        className='h-24 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/0 placeholder:text-slate-400 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20'
        placeholder='可以直接提问，或者结合上传的 .txt / .md 让它帮你做结构化解读…'
        value={input}
        onChange={(e) => onChangeInput(e.target.value)}
      />

      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='space-y-1 text-[11px] text-slate-500'>
          <label className='inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-emerald-500/70 hover:text-emerald-600'>
            <span>上传 .txt / .md 文件</span>
            <input
              type='file'
              accept='.txt,.md'
              className='hidden'
              onChange={onFileChange}
            />
          </label>
          <div className='flex flex-wrap items-center gap-1'>
            {fileError && (
              <span className='text-[11px] text-red-500'>{fileError}</span>
            )}
            {!fileError && fileName && (
              <span className='text-[11px] text-emerald-600'>
                {fileName} · 文件已载入
              </span>
            )}
            <span className='text-[11px] text-slate-400'>单文件大小 ≤ 100KB</span>
          </div>
        </div>

        <button
          type='button'
          onClick={onSend}
          disabled={!canSend}
          className='inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-emerald-50 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:text-emerald-800 disabled:shadow-none'
        >
          {loading ? '发送中…' : '发送'}
        </button>
      </div>
    </section>
  );
}

