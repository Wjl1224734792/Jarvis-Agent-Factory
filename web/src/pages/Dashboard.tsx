import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Alert, Card, Progress, Tag, Modal,
  Button, Empty, Spin, Timeline, Statistic, message,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined,
  ThunderboltOutlined, QuestionCircleOutlined,
  HistoryOutlined, LoadingOutlined, FileSearchOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { PipelineSession, PipelineRun } from '../api';
import { api } from '../api';
import { useSessionId } from '../components/Layout';
import ErrorBoundary from '../components/ErrorBoundary';
import X6FlowChart from '../components/X6FlowChart';
import X6AgentGraph from '../components/X6AgentGraph';
import { useAgentData } from '../hooks/useAgentData';
import type { AgentGateStatusResponse } from '../api';

// ============================================================
// 常量
// ============================================================

function shortGate(gate: string): string {
  return gate.startsWith('Gate ') ? gate.slice(5) : gate;
}

const GATE_COLORS: Record<string, string> = {
  A: 'var(--ant-color-primary)', B: 'var(--ant-color-primary)', C: 'var(--ant-color-primary)',
  C1: 'var(--ant-color-success)', 'C1.5': 'var(--ant-color-text)', C2: 'var(--ant-color-error)',
  D: 'var(--ant-color-primary)', E: 'var(--ant-color-primary)',
};

const GATE_LABELS: Record<string, string> = {
  A: '需求澄清', 'B-DDD': '领域分析', 'B-BDD': '行为驱动', 'B-TDD': '测试任务',
  B1: '架构评审', C: '执行规划',
  'C-impl': '并行实现', C1: '代码质量', 'C1.5': '视觉验证', C2: '测试验证',
  D: '评审', E: '发布上线',
};

const GATE_DESCRIPTIONS: Record<string, string> = {
  'Gate A': '至少1个需求文档，含REQ-XXX编号',
  'Gate B-DDD': 'DDD领域分析：聚合/实体/值对象/领域服务',
  'Gate B-BDD': 'BDD行为场景：Gherkin Given/When/Then',
  'Gate B-TDD': 'TDD任务包：Red→Green→Refactor',
  'Gate B1': '架构评审通过（涉及架构变更时）',
  'Gate C': '计划文档含parallel_batches+Execution Packet',
  'Gate C-impl': '所有Batch实现完成，实现Agent已返回结果',
  'Gate C1': 'Lint+Type-check+Build+Deps Audit全部通过',
  'Gate C1.5': '页面/组件视觉验证截图证据已附',
  'Gate C2': '测试全部通过，API契约验证通过',
  'Gate D': '领域审查+安全审计+性能审计通过',
  'Gate E': '安全审计+上线检查清单+回滚预案就绪',
};

const RUN_STATUS: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: '进行中', color: 'var(--ant-color-primary)', bgColor: 'var(--ant-color-primary-bg)' },
  completed: { label: '已完成', color: 'var(--ant-color-success)', bgColor: 'var(--ant-color-success-bg)' },
  failed: { label: '失败', color: 'var(--ant-color-error)', bgColor: 'var(--ant-color-error-bg)' },
  archived: { label: '已归档', color: 'var(--ant-color-text)', bgColor: 'var(--ant-color-fill-quaternary)' },
};

const MARKDOWN_CSS = `
.markdown-body { font-size: 14px; line-height: 1.7; color: var(--ant-color-text); }
.markdown-body h1, .markdown-body h2, .markdown-body h3 { color: var(--ant-color-text); font-weight: 700; border-bottom: 2px solid var(--ant-color-primary-bg); padding-bottom: 6px; }
.markdown-body h1 { font-size: 1.6em; }
.markdown-body h2 { font-size: 1.35em; }
.markdown-body h3 { font-size: 1.15em; }
.markdown-body table { border-collapse: collapse; width: 100%; }
.markdown-body th, .markdown-body td { border: 1px solid var(--ant-color-border); padding: 8px 12px; text-align: left; }
.markdown-body th { background: var(--ant-color-primary-bg); font-weight: 700; }
.markdown-body tr:nth-child(even) { background: var(--ant-color-bg-container); }
.markdown-body blockquote { border-left: 4px solid var(--ant-color-primary); padding-left: 16px; color: var(--ant-color-text); margin: 12px 0; background: var(--ant-color-primary-bg); padding: 8px 16px; border-radius: 0 8px 8px 0; }
.markdown-body code { background: var(--ant-color-fill-quaternary); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; color: var(--ant-color-text); font-family: 'Consolas', 'Monaco', monospace; }
.markdown-body pre { background: var(--ant-color-fill-quaternary); border: 1px solid var(--ant-color-border); border-radius: 8px; padding: 16px; overflow-x: auto; }
.markdown-body pre code { background: transparent; padding: 0; border-radius: 0; }
.markdown-body ul, .markdown-body ol { padding-left: 24px; }
.markdown-body hr { border: none; border-top: 2px solid var(--ant-color-border); margin: 24px 0; }
.markdown-body a { color: var(--ant-color-primary); font-weight: 600; }
.markdown-body img { max-width: 100%; border-radius: 8px; border: 1px solid var(--ant-color-border); }
`;

// ============================================================
// 懒加载 Markdown
// ============================================================

const LazyMarkdown = React.lazy(async () => {
  const [md, gfm, syntaxModule, styleModule] = await Promise.all([
    import('react-markdown'),
    import('remark-gfm'),
    import('react-syntax-highlighter'),
    import('react-syntax-highlighter/dist/esm/styles/prism'),
  ]);
  const { Prism: SyntaxHighlighter } = syntaxModule;
  const { oneLight } = styleModule;
  const MarkdownComponent = md.default || md;

  return {
    default: ({ content }: { content: string }) => (
      <MarkdownComponent
        remarkPlugins={[gfm.default]}
        urlTransform={(url: string) => {
          if (/^(https?:\/\/|mailto:|\/|#|\.)/.test(url)) return url;
          return '';
        }}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeStr = String(children).replace(/\n$/, '');
            if (match) {
              return <SyntaxHighlighter style={oneLight} language={match[1]} PreTag="div">{codeStr}</SyntaxHighlighter>;
            }
            return <code className={className} {...props}>{children}</code>;
          },
        }}
      >
        {content}
      </MarkdownComponent>
    ),
  };
});

// ============================================================
// 工具函数
// ============================================================

function formatTime(ts: string | null | undefined): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function formatDurationDisplay(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}分${s}秒` : `${m}分`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  let r = `${h}小时`;
  if (rm > 0) r += `${rm}分`;
  if (s > 0) r += `${s}秒`;
  return r;
}

/** Token 数量格式化为人类可读 */
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** 简化 Agent 名称显示 */
function shortAgentName(name: string): string {
  return name.length > 14 ? name.substring(0, 13) + '…' : name;
}

// 模型单价（USD/1M tokens）
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7':   { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6': { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5':  { input: 1.00,  output: 5.00 },
};

// ============================================================
// Dashboard 组件
// ============================================================

export default function Dashboard() {
  const sessionId = useSessionId();
  const [pipeline, setPipeline] = useState<PipelineSession | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mdPreview, setMdPreview] = useState<{ open: boolean; content: string; title: string }>({
    open: false, content: '', title: '',
  });

  // 右侧栏宽度（可拖拽调整）
  const [rightPanelWidth, setRightPanelWidth] = useState(340);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // FlowChart 高度（可拖拽调整）
  const [flowChartHeight, setFlowChartHeight] = useState(150);
  const splitterContainerRef = useRef<HTMLDivElement>(null);
  const splitterDraggingRef = useRef(false);

  const runId = useMemo(() => (pipeline ? sessionId : null), [pipeline, sessionId]);
  const { agentStatus, agentUsage, loading: agentLoading } = useAgentData(runId);
  const [gateStatus, setGateStatus] = useState<AgentGateStatusResponse | null>(null);
  const [selectedGate, setSelectedGate] = useState<string | null>(null);

  // 按 Gate 分组的 Agent 状态轮询
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    const fetch = async () => {
      try {
        const gs = await api.agentGateStatus(runId);
        if (!cancelled) setGateStatus(gs);
      } catch { /* ignore */ }
    };
    fetch();
    const timer = setInterval(fetch, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [runId]);

  const loadData = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [sessions, pipelineRuns] = await Promise.all([
        api.pipeline(),
        api.pipelineRuns(sessionId),
      ]);
      setPipeline(sessions.find(s => s.session_id === sessionId) || null);
      setRuns(pipelineRuns);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 8000);
    return () => clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    const id = 'markdown-custom-style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = MARKDOWN_CSS;
      document.head.appendChild(style);
    }
  }, []);

  // 中间区域 MD 预览打开
  const openMdPreview = async (filepath: string) => {
    try {
      const sanitized = filepath.replace(/\.\.\/|\.\.\\/g, '');
      const content = await api.docContent(sanitized);
      setMdPreview({ open: true, content, title: filepath });
    } catch { message.error('文档加载失败'); }
  };

  // 右侧栏拖拽调整宽度
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = startX - ev.clientX;
      const newWidth = Math.max(240, Math.min(600, startWidth + delta));
      setRightPanelWidth(newWidth);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [rightPanelWidth]);

  // FlowChart 高度拖拽调整（水平分割线）
  const handleFlowChartResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    splitterDraggingRef.current = true;
    const startY = e.clientY;
    const startHeight = flowChartHeight;

    const onMove = (ev: MouseEvent) => {
      if (!splitterDraggingRef.current) return;
      const container = splitterContainerRef.current;
      if (!container) return;
      const containerHeight = container.getBoundingClientRect().height;
      const delta = ev.clientY - startY;
      const newHeight = startHeight + delta;
      // FlowChart 最小 80px，AgentGraph 最小 150px（分割线 6px）
      const maxHeight = containerHeight - 6 - 150;
      const clamped = Math.max(80, Math.min(maxHeight, newHeight));
      setFlowChartHeight(clamped);
    };
    const onUp = () => {
      splitterDraggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [flowChartHeight]);

  // ============================================================
  // 数据派生
  // ============================================================

  const { gates, completedGates, totalGates, progressPct, currentGate, totalArtifacts, totalDuration } = useMemo(() => {
    const g = pipeline?.gates || [];
    const completed = g.filter(x => x.passed).length;
    const total = g.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const cur = pipeline?.current_gate || '?';
    const artifacts = g.reduce((s, x) => s + (x.artifacts?.length || 0), 0);
    const dur = g.reduce((s, x) => s + (x.duration_seconds || 0), 0);
    return { gates: g, completedGates: completed, totalGates: total, progressPct: pct,
             currentGate: cur, totalArtifacts: artifacts, totalDuration: dur };
  }, [pipeline?.gates, pipeline?.current_gate]);

  const durationDisplay = useMemo(() => totalDuration > 0 ? formatDurationDisplay(totalDuration) : '-', [totalDuration]);

  // Token 统计（来自 agentUsage）
  const tokenStats = useMemo(() => {
    if (!agentUsage?.totals) return { total: 0, cost: 0, calls: 0, topAgent: '' };
    const t = agentUsage.totals;
    const total = (t.total_input_tokens || 0) + (t.total_output_tokens || 0) + (t.total_cache_creation_input_tokens || 0) + (t.total_cache_read_input_tokens || 0);
    // 成本估算
    let cost = 0;
    Object.values(agentUsage.agents || {}).forEach((a: any) => {
      const prices = MODEL_PRICES[a.model];
      if (prices) {
        cost += (a.total_input_tokens / 1_000_000) * prices.input + (a.total_output_tokens / 1_000_000) * prices.output;
      }
    });
    // Top agent
    let topAgent = '';
    let topTokens = 0;
    Object.entries(agentUsage.agents || {}).forEach(([id, a]: [string, any]) => {
      const at = (a.total_input_tokens || 0) + (a.total_output_tokens || 0);
      if (at > topTokens) { topTokens = at; topAgent = id; }
    });
    return { total, cost, calls: t.calls, topAgent };
  }, [agentUsage]);

  // ============================================================
  // 空状态
  // ============================================================

  if (!sessionId) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--ant-color-text)', opacity: 0.4 }}>
        <ThunderboltOutlined style={{ fontSize: 48, marginBottom: 16 }} />
        <div style={{ fontSize: 14 }}>选择一个会话查看流水线状态</div>
      </div>
    );
  }

  if (loading && !pipeline) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin indicator={<LoadingOutlined style={{ color: 'var(--ant-color-primary)' }} />} /></div>;
  }

  if (!pipeline) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Empty description="暂无流水线数据" /></div>;
  }

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── 标题栏 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ant-color-text)' }}>
            {pipeline.pipeline_name || pipeline.pipeline_type} · {currentGate}
          </span>
          <Tag style={{ marginLeft: 8, borderRadius: 12, backgroundColor: 'var(--ant-color-primary-bg)', color: 'var(--ant-color-primary)', border: 'none' }}>
            {pipeline.platform}
          </Tag>
        </div>
        <Button icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)}
          style={{ borderRadius: 18, color: 'var(--ant-color-primary)' }}>
          操作指南
        </Button>
      </div>

      {/* ── 统计卡片（含 Token 数据）── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        marginBottom: 10, flexShrink: 0,
      }}>
        {[
          { title: 'Token 消耗', value: formatTokens(tokenStats.total), suffix: '', color: tokenStats.total > 0 ? 'var(--ant-color-primary)' : 'var(--ant-color-text)' },
          { title: '预估成本', value: tokenStats.cost > 0 ? `$${tokenStats.cost.toFixed(3)}` : '-', suffix: '', color: 'var(--ant-color-primary)' },
          { title: 'Agent 调用', value: tokenStats.calls, suffix: '次', color: 'var(--ant-color-primary)' },
          { title: '完成进度', value: progressPct, suffix: '%', color: 'var(--ant-color-primary)' },
          { title: '已通过 Gate', value: `${completedGates}/${totalGates}`, suffix: '', color: 'var(--ant-color-primary)' },
          { title: '产物文件', value: totalArtifacts, suffix: '个', color: 'var(--ant-color-primary)' },
          { title: '总耗时', value: durationDisplay, suffix: '', color: 'var(--ant-color-primary)' },
        ].map((stat, i) => (
          <Card key={i} size="small" style={{
            flex: '1 1 0', minWidth: 120, borderRadius: 14,
          }}>
            <Statistic title={stat.title} value={stat.value} suffix={stat.suffix}
              styles={{ content: { color: stat.color, fontSize: 20 } }} />
          </Card>
        ))}
      </div>

      {/* ── 内容区：中间 + 右侧栏 ── */}
      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden', minHeight: 0 }}>

        {/* ============ 中间区域 ============ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: 8, minWidth: 0 }}>

          {/* MD 预览模式 */}
          {mdPreview.open ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ant-color-text)' }}>
                  <FileSearchOutlined style={{ marginRight: 6 }} />{mdPreview.title}
                </span>
                <Button type="text" size="small" icon={<CloseOutlined />}
                  onClick={() => setMdPreview({ open: false, content: '', title: '' })} />
              </div>
              <div className="markdown-body" style={{ flex: 1, overflow: 'auto', padding: '12px 16px',
                borderRadius: 12, border: '1px solid var(--ant-color-border-secondary)',
                background: 'var(--ant-color-bg-container)' }}>
                <ErrorBoundary>
                  <React.Suspense fallback={<Spin />}>
                    <LazyMarkdown content={mdPreview.content} />
                  </React.Suspense>
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <div ref={splitterContainerRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {/* 紧凑流水线进度条 */}
              <div style={{ flexShrink: 0, height: flowChartHeight }}>
                <ErrorBoundary fallback={<Alert type="error" message="流水线进度加载失败" showIcon style={{ borderRadius: 12 }} />}>
                  <X6FlowChart
                    runId={runId}
                    agentStatus={agentStatus}
                    agentUsage={agentUsage}
                    pipelineGates={gates.map(g => ({ gate: g.gate, passed: g.passed }))}
                    selectedGate={selectedGate}
                    onGateSelect={setSelectedGate}
                  />
                </ErrorBoundary>
              </div>
              {/* 水平拖拽分割线 */}
              <div
                role="separator"
                aria-orientation="horizontal"
                aria-valuenow={flowChartHeight}
                aria-valuemin={80}
                aria-valuemax={splitterContainerRef.current ? splitterContainerRef.current.getBoundingClientRect().height - 156 : 800}
                tabIndex={0}
                onMouseDown={handleFlowChartResize}
                onKeyDown={(e) => {
                  const container = splitterContainerRef.current;
                  const containerHeight = container ? container.getBoundingClientRect().height : 800;
                  if (e.key === 'ArrowUp') setFlowChartHeight(h => Math.min(containerHeight - 156, h + 20));
                  if (e.key === 'ArrowDown') setFlowChartHeight(h => Math.max(80, h - 20));
                }}
                style={{
                  height: 6, flexShrink: 0, cursor: 'row-resize',
                  background: 'transparent', transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                  userSelect: 'none',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.background = 'var(--ant-color-primary-bg)';
                  const line = (e.target as HTMLElement).querySelector('.splitter-line') as HTMLElement;
                  if (line) line.style.opacity = '1';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.background = 'transparent';
                  const line = (e.target as HTMLElement).querySelector('.splitter-line') as HTMLElement;
                  if (line) line.style.opacity = '0';
                }}
              >
                {/* hover 时显示的 2px colorPrimary 横线 */}
                <div className="splitter-line" style={{
                  position: 'absolute', top: '50%', left: 0, right: 0,
                  height: 2, background: 'var(--ant-color-primary)',
                  transform: 'translateY(-50%)',
                  opacity: 0, transition: 'opacity 0.15s',
                }} />
                {/* 拖拽手柄图标 */}
                <span style={{
                  fontSize: 12, color: 'var(--ant-color-primary)',
                  lineHeight: '6px', position: 'relative', zIndex: 1,
                  background: 'var(--ant-color-bg-container)',
                  padding: '0 4px', borderRadius: 4,
                }}>&#x2261;</span>
              </div>
              {/* 选中 Gate 的 Agent 交互图 */}
              <div style={{ flex: 1, minHeight: 0, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                <ErrorBoundary fallback={<Alert type="error" message="Agent 交互图加载失败" showIcon style={{ borderRadius: 12 }} />}>
                  <X6AgentGraph
                    selectedGate={selectedGate || currentGate}
                    gateStatus={gateStatus}
                    style={{ width: '100%', height: '100%' }}
                  />
                </ErrorBoundary>
              </div>
            </div>
          )}
        </div>

        {/* ============ 拖拽分割线 ============ */}
        <div
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
          onMouseDown={handleResizeStart}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setRightPanelWidth(w => Math.min(600, w + 20));
            if (e.key === 'ArrowRight') setRightPanelWidth(w => Math.max(240, w - 20));
          }}
          style={{
            width: 6, cursor: 'col-resize', flexShrink: 0,
            background: 'transparent', transition: 'background 0.15s',
            borderLeft: '1px solid var(--ant-color-border-secondary)',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--ant-color-primary-bg)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
        />

        {/* ============ 右侧栏：Gate 步骤 + 历史 Runs ============ */}
        <div ref={rightPanelRef} style={{
          width: rightPanelWidth, flexShrink: 0, overflow: 'auto',
          paddingLeft: 8,
        }}>
          {/* Gate 进度条 */}
          <Card
            title={<span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ant-color-text)' }}>Gate 进度</span>}
            size="small"
            style={{ borderRadius: 14, marginBottom: 8 }}
          >
            <Progress
              percent={progressPct}
              strokeColor="var(--ant-color-primary)"
              railColor="var(--ant-color-fill-tertiary)"
              size="small"
              style={{ marginBottom: 10 }}
            />
            <Timeline
              items={gates.map(g => {
                const sg = shortGate(g.gate);
                const passed = g.passed;
                const isCurrent = g.gate === currentGate;
                return {
                  color: passed ? 'var(--ant-color-success)' : isCurrent ? 'var(--ant-color-primary)' : 'var(--ant-color-text)',
                  icon: passed ? <CheckCircleOutlined style={{ fontSize: 14 }} /> :
                       isCurrent ? <LoadingOutlined style={{ fontSize: 14 }} /> :
                       <ClockCircleOutlined style={{ fontSize: 14 }} />,
                  content: (
                    <div
                      onClick={() => {
                        const firstMd = (g.artifacts || []).find((a: string) => a.endsWith('.md'));
                        if (firstMd) openMdPreview(firstMd);
                      }}
                      style={{
                        padding: '6px 10px', borderRadius: 10,
                        backgroundColor: isCurrent ? 'var(--ant-color-primary-bg)' : 'transparent',
                        border: isCurrent ? '2px solid var(--ant-color-primary)' : '1px solid var(--ant-color-border)',
                        cursor: (g.artifacts || []).some((a: string) => a.endsWith('.md')) ? 'pointer' : 'default',
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: GATE_COLORS[sg] || 'var(--ant-color-primary)' }}>{g.gate}</span>
                        <span style={{ color: 'var(--ant-color-text)', fontSize: 11 }}>{GATE_LABELS[sg] || sg}</span>
                        {passed && <Tag color="var(--ant-color-success)" style={{ borderRadius: 6, fontSize: 10, margin: 0, lineHeight: '16px' }}>✓</Tag>}
                        {isCurrent && <Tag color="var(--ant-color-primary)" style={{ borderRadius: 6, fontSize: 10, margin: 0, lineHeight: '16px' }}>进行中</Tag>}
                      </div>
                      {GATE_DESCRIPTIONS[g.gate] && (
                        <div style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.45, marginTop: 2 }}>
                          {GATE_DESCRIPTIONS[g.gate]}
                        </div>
                      )}
                      {g.entered_at && (
                        <div style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.4, marginTop: 2 }}>
                          进入: {formatTime(g.entered_at)}{g.duration_display ? ` · 耗时: ${g.duration_display}` : ''}
                        </div>
                      )}
                      {(g.artifacts || []).length > 0 && (
                        <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(g.artifacts || []).map((a: string, i: number) => (
                            <Tag key={i} style={{ borderRadius: 6, fontSize: 10, cursor: 'pointer', margin: 0 }}
                              color="var(--ant-color-primary)"
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); openMdPreview(a); }}>
                              {a.split('/').pop()}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                };
              })}
            />
          </Card>

          {/* 历史 Runs */}
          <Card
            title={<span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ant-color-text)' }}>
              <HistoryOutlined style={{ marginRight: 4 }} />历史 Runs · {runs.length}
            </span>}
            size="small"
            style={{ borderRadius: 14 }}
          >
            {runs.length === 0 ? (
              <Empty description="暂无" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {runs.map(r => {
                  const st = RUN_STATUS[r.status] || { label: r.status, color: 'var(--ant-color-text)', bgColor: 'var(--ant-color-fill-quaternary)' };
                  return (
                    <div key={r.id} style={{
                      padding: '6px 10px', borderRadius: 10, marginBottom: 4,
                      border: '1px solid var(--ant-color-border)', fontSize: 11,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ant-color-text)' }}>{r.task_name || '未命名'}</span>
                        <Tag style={{ borderRadius: 6, fontSize: 10, margin: 0, backgroundColor: st.bgColor, color: st.color, border: 'none' }}>{st.label}</Tag>
                      </div>
                      <div style={{ color: 'var(--ant-color-text)', opacity: 0.45, fontSize: 10, marginTop: 2 }}>
                        {r.pipeline_type} · {r.current_gate} · {formatTime(r.started_at)}
                        {r.total_duration_display ? ` · ${r.total_duration_display}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 帮助弹窗 */}
      <Modal title="操作指南" open={helpOpen} onCancel={() => setHelpOpen(false)} footer={null} width={400}>
        <Timeline items={[
          { color: 'var(--ant-color-primary)', content: <strong>启动任务</strong> },
          { color: 'var(--ant-color-primary)', content: '在 Claude Code / OpenCode / Codex 中输入 /jarvis 命令' },
          { color: 'var(--ant-color-primary)', content: <strong>等待 Gate 通过</strong> },
          { color: 'var(--ant-color-primary)', content: '每个 Gate 完成后自动推进，点击文件标签可查看产物文档' },
        ]} />
      </Modal>
    </div>
  );
}
