import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

/** 乐观默认值：假设所有 AI 功能均已开启 */
const DEFAULT_FEATURES = {
  summary: true,
  format: true,
  chat: true,
} as const;

/**
 * AI 功能开关查询 hook
 * 调用 GET /api/v1/ai/features 获取 AI 功能开关状态，供 Web 端条件渲染使用。
 * 使用乐观默认值（全部开启），未登录或请求失败时优雅降级。
 *
 * @returns summary / format / chat 开关状态与加载态
 */
export function useAiFeatures() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai', 'features'],
    queryFn: async () => {
      const response = await apiClient.getAiFeatures();
      return response.features;
    },
    staleTime: 15 * 60 * 1000,
    placeholderData: DEFAULT_FEATURES,
  });

  const features = data ?? DEFAULT_FEATURES;

  return {
    summary: features.summary,
    format: features.format,
    chat: features.chat,
    isLoading,
  };
}
