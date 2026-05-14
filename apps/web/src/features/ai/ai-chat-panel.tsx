import { SendHorizonalIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAiChat, type ChatMessage } from './use-ai-chat';

interface AiChatPanelProps {
  /** 当前文章纯文本内容 */
  articleContent: string;
  /** 当前文章标题 */
  articleTitle: string;
  /** 面板是否打开 */
  isOpen: boolean;
  /** 关闭面板回调 */
  onClose: () => void;
  /** 面板宽度（px） */
  width: number;
  /** 开始拖拽调整宽度回调 */
  onResizeStart: (e: React.MouseEvent) => void;
}

/**
 * 消息气泡组件
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-surface-1 text-foreground'
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

/**
 * AI 聊天侧边栏面板
 * 从右侧滑出，覆盖在预览面板上，支持拖拽调整宽度
 */
export function AiChatPanel({
  articleContent,
  articleTitle,
  isOpen,
  onClose,
  width,
  onResizeStart,
}: AiChatPanelProps) {
  const chat = useAiChat();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** 自动滚动到底部 */
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat.messages, isOpen]);

  /** 打开面板时聚焦输入框 */
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const message = inputValue.trim();
    if (!message || chat.isLoading) {
      return;
    }

    setInputValue('');
    await chat.sendMessage(message, articleContent, articleTitle);
  }, [articleContent, articleTitle, chat, inputValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 right-0 top-0 z-50 flex"
      style={{ width }}
    >
      {/* 拖拽手柄 */}
      <div
        className="group absolute -left-2 top-0 z-10 flex h-full w-4 cursor-col-resize items-center justify-center"
        onMouseDown={onResizeStart}
      >
        <div className="h-full w-1 rounded-full bg-border/60 transition group-hover:bg-primary/40" />
      </div>

      {/* 面板主体 */}
      <div className="flex h-full w-full flex-col border-l border-border/70 bg-white shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="text-sm font-medium text-foreground">
            AI 写作助手
          </div>
          <button
            aria-label="关闭 AI 聊天面板"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-1 hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {chat.messages.length === 0 && !chat.isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
              <div className="text-2xl">AI</div>
              <div>
                我是你的写作助手，可以帮你分析文章内容、提供写作建议。
              </div>
              <div className="text-xs text-muted-foreground/70">
                输入问题开始对话
              </div>
            </div>
          ) : null}

          {chat.messages.map((msg, index) => (
            <MessageBubble key={index} message={msg} />
          ))}

          {chat.isLoading ? (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl bg-surface-1 px-4 py-2.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="animate-pulse">思考中</span>
                  <span className="inline-flex gap-0.5">
                    <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                    <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                    <span className="size-1 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                  </span>
                </span>
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        {/* 错误提示 */}
        {chat.error ? (
          <div className="border-t border-border/60 bg-destructive/5 px-4 py-2 text-xs text-destructive">
            {chat.error}
          </div>
        ) : null}

        {/* 输入区域 */}
        <div className="border-t border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-lg border border-border/70 bg-surface-1/72 px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
              disabled={chat.isLoading}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题..."
              ref={inputRef}
              type="text"
              value={inputValue}
            />
            <Button
              className="shrink-0"
              disabled={!inputValue.trim() || chat.isLoading}
              onClick={() => void handleSend()}
              size="sm"
              type="button"
            >
              <SendHorizonalIcon className="size-4" />
            </Button>
          </div>
          {chat.messages.length > 0 ? (
            <button
              className="mt-2 text-xs text-muted-foreground/60 transition hover:text-muted-foreground"
              onClick={chat.clearMessages}
              type="button"
            >
              清空对话
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
