import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

interface FormatContentParams {
  /** 原始 HTML 内容 */
  content: string;
  /** 排版模式 */
  mode: 'beautify' | 'structure';
}

/**
 * AI 排版 hook
 * 封装排版 API 调用逻辑，使用 TanStack Query 的 useMutation
 *
 * @returns 排版函数、格式化 HTML、变更说明、加载状态、错误状态
 */
export function useAiFormat() {
  const mutation = useMutation({
    mutationFn: async (params: FormatContentParams) => {
      return apiClient.formatAiContent(params.content, params.mode);
    }
  });

  return {
    /** 触发排版 */
    format: mutation.mutate,
    /** 异步触发排版（返回 Promise） */
    formatAsync: mutation.mutateAsync,
    /** 格式化后的 HTML */
    formattedHtml: mutation.data?.html ?? null,
    /** 变更说明列表 */
    changes: mutation.data?.changes ?? [],
    /** 是否正在加载 */
    isLoading: mutation.isPending,
    /** 是否成功 */
    isSuccess: mutation.isSuccess,
    /** 错误信息 */
    error: mutation.error ?? null,
    /** 重置状态 */
    reset: mutation.reset
  };
}
