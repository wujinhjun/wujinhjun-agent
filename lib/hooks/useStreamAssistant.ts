import { useCallback } from 'react';
import type { ChatMsg } from '../chatTypes';

type SetMessages = React.Dispatch<React.SetStateAction<ChatMsg[]>>;

const useWaitNextFrame = () =>
  useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (typeof window === 'undefined') {
          resolve();
          return;
        }
        window.requestAnimationFrame(() => resolve());
      }),
    [],
  );

export function useStreamAssistant(setMessages: SetMessages) {
  const waitNextFrame = useWaitNextFrame();

  const streamAssistantFromResponse = useCallback(
    async (res: Response) => {
      const body = res.body;

      if (!body) {
        const fallbackText = await res.text();
        const safeText = fallbackText || '（没有返回内容）';

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: safeText },
        ]);
        return;
      }

      const reader = body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let fullText = '';

      // 先插入一条空的 assistant 消息
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      // 渲染循环：按帧刷新 UI，避免逐 token 频繁 setState
      let streaming = true;
      const renderLoop = async () => {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          // eslint-disable-next-line no-await-in-loop
          await waitNextFrame();

          if (!streaming) {
            break;
          }

          const snapshot = fullText;

          setMessages((prev) => {
            if (prev.length === 0) {
              return [{ role: 'assistant', content: snapshot }];
            }

            const next = [...prev];
            const lastIndex = next.length - 1;
            const last = next[lastIndex];

            if (!last || last.role !== 'assistant') {
              next.push({ role: 'assistant', content: snapshot });
              return next;
            }

            next[lastIndex] = { ...last, content: snapshot };
            return next;
          });
        }
      };

      void renderLoop();

      try {
        while (!done) {
          // eslint-disable-next-line no-await-in-loop
          const { value, done: doneReading } = await reader.read();
          done = doneReading;

          if (value) {
            fullText += decoder.decode(value, { stream: !done });
          }
        }
      } finally {
        streaming = false;

        const finalText = fullText || '（没有返回内容）';

        setMessages((prev) => {
          if (prev.length === 0) {
            return [{ role: 'assistant', content: finalText }];
          }

          const next = [...prev];
          const lastIndex = next.length - 1;
          const last = next[lastIndex];

          if (!last || last.role !== 'assistant') {
            next.push({ role: 'assistant', content: finalText });
            return next;
          }

          next[lastIndex] = { ...last, content: finalText };
          return next;
        });
      }
    },
    [setMessages, waitNextFrame],
  );

  return { streamAssistantFromResponse };
}

