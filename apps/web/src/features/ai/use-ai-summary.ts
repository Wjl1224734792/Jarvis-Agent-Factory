import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

interface GenerateSummaryParams {
  /** 文章 ID */
  postId: string;
  /** 文章内容（可选，不传则后端从 DB 取） */
  content?: string;
}

/**
 * AI 摘要生成 hook
 * 封装摘要生成逻辑，使用 TanStack Query 的 useMutation
 *
 * @returns 生成函数、摘要数据、加载状态、错误状态
 */
export function useAiSummary() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: GenerateSummaryParams) => {
      return apiClient.generateAiSummary(params.postId, params.content);
    },
    onSuccess: (data, variables) => {
      // 缓存摘要结果，以便后续查询可直接使用
      queryClient.setQueryData(['ai-summary', variables.postId], data);
    }
  });

  return {
    /** 触发摘要生成 */
    generate: mutation.mutate,
    /** 异步触发摘要生成（返回 Promise） */
    generateAsync: mutation.mutateAsync,
    /** 摘要数据 */
    summary: mutation.data?.summary ?? null,
    /** 是否缓存命中 */
    cached: mutation.data?.cached ?? false,
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
