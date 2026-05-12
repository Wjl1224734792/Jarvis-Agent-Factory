import { useState, useEffect, useRef } from 'react';
import { api, type AgentStatusResponse } from '../api';

/** agent 状态轮询 hook */
export function useAgentData(
  runId: string | null,
  intervalMs = 8000,
): {
  agentStatus: AgentStatusResponse | null;
  loading: boolean;
  error: Error | null;
} {
  const [agentStatus, setAgentStatus] = useState<AgentStatusResponse | null>(null);
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
        const status = await api.agentStatus(runId);
        if (!cancelled) {
          setAgentStatus(status);
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

  return { agentStatus, loading, error };
}

export type { AgentStatusResponse };
