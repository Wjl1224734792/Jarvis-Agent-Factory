import { useCallback, useState } from 'react';
import { apiClient } from '../../lib/api-client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * AI 聊天 hook
 * 封装聊天逻辑，管理消息列表、发送消息、加载状态
 *
 * @returns 消息列表、发送函数、加载状态、错误状态、清空函数
 */
export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 发送消息到 AI 聊天接口
   * @param message - 用户提问
   * @param context - 文章内容（可选）
   * @param title - 文章标题（可选）
   */
  const sendMessage = useCallback(
    async (message: string, context?: string, title?: string) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }

      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.aiChat(trimmed, context, title);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.reply },
        ]);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'AI 聊天失败，请稍后重试';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /** 清空所有消息 */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
