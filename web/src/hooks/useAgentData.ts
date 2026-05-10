import { useState, useEffect, useRef } from 'react';
import { api, type AgentStatusResponse, type AgentUsageResponse } from '../api';

/** 统一的 agent 数据轮询 hook，同时拉取 status 和 usage 两个端点 */
export function useAgentData(
  runId: string | null,
  intervalMs = 8000,
): {
  agentStatus: AgentStatusResponse | null;
  agentUsage: AgentUsageResponse | null;
  loading: boolean;
  error: Error | null;
} {
  const [agentStatus, setAgentStatus] = useState<AgentStatusResponse | null>(null);
  const [agentUsage, setAgentUsage] = useState<AgentUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // runId 为空时不发起请求
    if (!runId) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      try {
        const [status, usage] = await Promise.all([
          api.agentStatus(runId),
          api.agentUsage(runId),
        ]);
        if (!cancelled) {
          setAgentStatus(status);
          setAgentUsage(usage);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    timerRef.current = setInterval(fetch, intervalMs);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [runId, intervalMs]);

  return { agentStatus, agentUsage, loading, error };
}

export type { AgentStatusResponse, AgentUsageResponse };
