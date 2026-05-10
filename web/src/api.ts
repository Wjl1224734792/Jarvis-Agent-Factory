const BASE = '';

async function fetchJSON(path: string, init?: Record<string, unknown>) {
  const r = await fetch(BASE + path, init);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export interface Session {
  id: string; platform: string; role: string; gate: string;
  pipeline_type: string; heartbeat: number; status: string;
  task_name: string | null; run_id: string | null;
  pinned: number; latest_run_started_at: string | null;
}

export interface GateState {
  gate: string; passed: boolean; artifacts: string[];
  entered_at: string | null; duration_seconds: number | null;
  duration_display: string | null;
}

export interface PipelineSession {
  session_id: string; platform: string; status: string;
  pipeline_type: string; pipeline_name: string;
  current_gate: string; completed: string[];
  gates: GateState[]; _display: string;
}

export interface PipelineRun {
  id: string; session_id: string; project: string;
  pipeline_type: string; current_gate: string;
  status: string; started_at: string; completed_at: string | null;
  task_name: string | null; archived: number; pinned: number;
  total_duration_seconds: number | null;
  total_duration_display: string | null;
}

export interface AgentItem {
  id: string; name: string; role: string; icon: string;
  platform: string; defaultModel: string; defaultEffort: string;
  category?: string; fileName?: string; subdir?: string;
  source?: 'template' | 'global' | 'project';
  model?: string; effort?: string; is_custom?: boolean;
}

// ============================================================
// Agent 状态 / 用量 / 事件类型（TASK-004）
// ============================================================

export interface AgentStatusResponse {
  run_id: string;
  active: string[];
  completed: string[];
  failed: string[];
}

export interface AgentUsageEntry {
  model: string;
  calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_input_tokens: number;
  total_cache_read_input_tokens: number;
}

export interface AgentUsageTotals {
  calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_input_tokens: number;
  total_cache_read_input_tokens: number;
}

export interface AgentUsageResponse {
  run_id: string;
  agents: Record<string, AgentUsageEntry>;
  totals: AgentUsageTotals;
}

export interface AgentEvent {
  id: number;
  run_id: string;
  session_id: string;
  agent_id: string;
  event_type: 'start' | 'end' | 'error';
  model: string | null;
  status: 'success' | 'error' | null;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  total_tokens: number;
  error_message: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface AgentsData {
  agents: AgentItem[];
  available_models: string[];
  available_efforts: string[];
  platforms: string[];
  platform_models: Record<string, string[]>;
  categories: string[];
  total_count: number;
  source_counts: Record<string, number>;
  project_name: string;
}

export const api = {
  health: () => fetchJSON('/health'),

  sessions: async (): Promise<Session[]> => {
    const d = await fetchJSON('/api/sessions');
    return d.sessions;
  },

  status: () => fetchJSON('/api/status'),

  pipeline: async (): Promise<PipelineSession[]> => {
    const d = await fetchJSON('/api/pipeline');
    return d.sessions;
  },

  gateEnforce: (gate: string, sessionId: string) =>
    fetchJSON(`/api/gate/${gate.replace(/ /g, '_')}/enforce?session_id=${sessionId}`),

  gateAdvance: (gate: string, sessionId: string) =>
    fetchJSON('/api/gate/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gate, session_id: sessionId }),
    }),

  resumeSession: (sessionId: string) =>
    fetchJSON(`/api/sessions/${encodeURIComponent(sessionId)}/resume`, { method: 'POST' }),

  pipelineRuns: async (sessionId: string): Promise<PipelineRun[]> => {
    const d = await fetchJSON(`/api/pipeline-runs?session_id=${encodeURIComponent(sessionId)}`);
    return d.runs;
  },

  archivedRuns: async (): Promise<PipelineRun[]> => {
    const d = await fetchJSON('/api/pipeline-runs/archived');
    return d.runs;
  },

  archiveRun: (runId: string) =>
    fetchJSON(`/api/pipeline-runs/${encodeURIComponent(runId)}/archive`, { method: 'POST' }),

  unarchiveRun: (runId: string) =>
    fetchJSON(`/api/pipeline-runs/${encodeURIComponent(runId)}/unarchive`, { method: 'POST' }),

  deleteRun: (runId: string) =>
    fetchJSON(`/api/pipeline-runs/${encodeURIComponent(runId)}`, { method: 'DELETE' }),

  pinRun: (runId: string) =>
    fetchJSON(`/api/pipeline-runs/${encodeURIComponent(runId)}/pin`, { method: 'POST' }),

  unpinRun: (runId: string) =>
    fetchJSON(`/api/pipeline-runs/${encodeURIComponent(runId)}/unpin`, { method: 'POST' }),

  agents: async (params?: Record<string, string>): Promise<AgentsData> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJSON(`/api/agents${qs}`);
  },

  saveAgent: (agentId: string, model: string, effort: string) =>
    fetchJSON('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, model, effort }),
    }),

  platforms: () => fetchJSON('/api/platforms'),

  docContent: async (filepath: string): Promise<string> => {
    const r = await fetch(BASE + `/api/docs/${encodeURIComponent(filepath)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  },

  agentStatus: (runId?: string): Promise<AgentStatusResponse> =>
    fetchJSON(`/api/agent-status${runId ? `?run_id=${encodeURIComponent(runId)}` : ''}`),

  agentUsage: (runId?: string): Promise<AgentUsageResponse> =>
    fetchJSON(`/api/agent-usage${runId ? `?run_id=${encodeURIComponent(runId)}` : ''}`),

  agentEvents: (runId: string, agentId: string): Promise<{ events: AgentEvent[] }> =>
    fetchJSON(`/api/agent-events?run_id=${encodeURIComponent(runId)}&agent_id=${encodeURIComponent(agentId)}`),
};
