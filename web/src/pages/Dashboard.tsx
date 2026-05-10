import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert, Card, Row, Col, Progress, Tag, Drawer, Modal,
  Button, Empty, Spin, Timeline, Statistic, message,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined,
  ThunderboltOutlined, QuestionCircleOutlined,
  HistoryOutlined, LoadingOutlined,
} from '@ant-design/icons';
import type { PipelineSession, PipelineRun } from '../api';
import { api } from '../api';
import { useSessionId } from '../components/Layout';
import ErrorBoundary from '../components/ErrorBoundary';
import G6FlowChart from '../components/G6FlowChart';
import TokenDashboard from '../components/TokenDashboard';
import { useAgentData } from '../hooks/useAgentData';

// API 返回的 gate 值含 "Gate " 前缀，如 "Gate A"、"Gate C1.5"
function shortGate(gate: string): string {
  return gate.startsWith('Gate ') ? gate.slice(5) : gate;
}

/** Gate 颜色使用 antd CSS 变量，支持 light/dark 自动切换 */
const GATE_COLORS: Record<string, string> = {
  A: 'var(--ant-color-primary)', B: 'var(--ant-color-primary)', C: 'var(--ant-color-primary)',
  C1: 'var(--ant-color-success)', 'C1.5': 'var(--ant-color-text)', C2: 'var(--ant-color-error)',
  D: 'var(--ant-color-primary)', E: 'var(--ant-color-primary)',
};

const GATE_LABELS: Record<string, string> = {
  A: '需求澄清', B: '任务分解', B1: '架构评审', C: '执行规划',
  'C-impl': '并行实现', C1: '代码质量', 'C1.5': '视觉验证', C2: '测试验证',
  D: '评审', E: '发布上线',
};

/** 每个 Gate 的功能说明（来自后端 GATE_CHECKS） */
const GATE_DESCRIPTIONS: Record<string, string> = {
  'Gate A': '至少1个需求文档，含REQ-XXX编号',
  'Gate B': '每个TASK-XXX映射至少1个REQ-XXX',
  'Gate B1': '架构评审通过（涉及架构变更时）',
  'Gate C': '计划文档含parallel_batches+Execution Packet',
  'Gate C-impl': '所有Batch实现完成，实现Agent已返回结果',
  'Gate C1': 'Lint+Type-check+Build+Deps Audit全部通过',
  'Gate C1.5': '页面/组件视觉验证截图证据已附',
  'Gate C2': '测试全部通过，API契约验证通过',
  'Gate D': '领域审查+安全审计+性能审计通过',
  'Gate E': '安全审计+上线检查清单+回滚预案就绪',
};

const GATE_ICONS: Record<string, React.ReactNode> = {
  A: <FileTextOutlined />, B: <ThunderboltOutlined />, C: <ThunderboltOutlined />,
  'C-impl': <ThunderboltOutlined />, C1: <CheckCircleOutlined />, 'C1.5': <CheckCircleOutlined />, C2: <CheckCircleOutlined />,
  D: <CheckCircleOutlined />, E: <CheckCircleOutlined />,
};

/** GitHub 风味 Markdown CSS，使用 antd CSS 变量适配 light/dark 主题 */
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

/** react-markdown + remark-gfm + 语法高亮 懒加载组件，减少初始 chunk 体积 */
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
          // 仅允许 http/https/mailto 和相对路径，阻断 javascript:/data: 等危险协议
          if (/^(https?:\/\/|mailto:|\/|#|\.)/.test(url)) return url;
          return '';
        }}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeStr = String(children).replace(/\n$/, '');
            if (match) {
              return (
                <SyntaxHighlighter
                  style={oneLight}
                  language={match[1]}
                  PreTag="div"
                >
                  {codeStr}
                </SyntaxHighlighter>
              );
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

/** 运行状态使用 antd CSS 变量，语义化映射 */
const RUN_STATUS: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: '进行中', color: 'var(--ant-color-primary)', bgColor: 'var(--ant-color-primary-bg)' },
  completed: { label: '已完成', color: 'var(--ant-color-success)', bgColor: 'var(--ant-color-success-bg)' },
  failed: { label: '失败', color: 'var(--ant-color-error)', bgColor: 'var(--ant-color-error-bg)' },
  archived: { label: '已归档', color: 'var(--ant-color-text)', bgColor: 'var(--ant-color-fill-quaternary)' },
};

function formatTime(ts: string | null | undefined): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function Dashboard() {
  const sessionId = useSessionId();
  const [pipeline, setPipeline] = useState<PipelineSession | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [docDrawer, setDocDrawer] = useState<{ open: boolean; content: string; title: string }>({
    open: false, content: '', title: '',
  });
  const [helpOpen, setHelpOpen] = useState(false);

  // 从 pipeline 中提取 runId，用于 agent 数据轮询
  const runId = useMemo(() => {
    if (!pipeline) return null;
    // pipeline 的 session_id 即 runId（TASK-002 契约）
    return sessionId;
  }, [pipeline, sessionId]);

  const { agentStatus, agentUsage, loading: agentLoading } = useAgentData(runId);

  const loadData = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [sessions, pipelineRuns] = await Promise.all([
        api.pipeline(),
        api.pipelineRuns(sessionId),
      ]);
      const ps = sessions.find(s => s.session_id === sessionId) || null;
      setPipeline(ps);
      setRuns(pipelineRuns);
    } catch {
      // 忽略加载错误
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 8000);
    return () => clearInterval(timer);
  }, [loadData]);

  // 一次性注入 Markdown CSS 到 document.head，避免每次抽屉打开重复注入
  useEffect(() => {
    const id = 'markdown-custom-style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = MARKDOWN_CSS;
      document.head.appendChild(style);
    }
  }, []);

  const openDoc = async (filepath: string, _gate?: string) => {
    try {
      // 前端路径消毒：移除 ../ 序列，防止路径遍历
      const sanitized = filepath.replace(/\.\.\/|\.\.\\/g, '');
      // artifacts 表已存储完整相对路径（如 "2026-05-10/requirements/topic.md"），直接使用
      const content = await api.docContent(sanitized);
      setDocDrawer({ open: true, content, title: filepath });
    } catch {
      message.error('文档加载失败');
    }
  };

  // useMemo 必须在条件返回之前调用（React Hooks 规则）
  const { gates, completedGates, totalGates, progressPct, currentGate,
          currentGateInfo, totalArtifacts, totalDuration } = useMemo(() => {
    const gates = pipeline?.gates || [];
    const completedGates = gates.filter(g => g.passed).length;
    const totalGates = gates.length;
    const progressPct = totalGates > 0 ? Math.round((completedGates / totalGates) * 100) : 0;
    const currentGate = pipeline?.current_gate || '?';
    const currentGateInfo = gates.find(g => g.gate === currentGate);
    const totalArtifacts = gates.reduce((sum, g) => sum + (g.artifacts?.length || 0), 0);
    const totalDuration = gates.reduce((sum, g) => sum + (g.duration_seconds || 0), 0);
    return { gates, completedGates, totalGates, progressPct, currentGate,
             currentGateInfo, totalArtifacts, totalDuration };
  }, [pipeline?.gates, pipeline?.current_gate]);

  const durationDisplay = useMemo(
    () => totalDuration > 0 ? formatDurationDisplay(totalDuration) : '-',
    [totalDuration]
  );

  if (!sessionId) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--ant-color-text)', opacity: 0.4 }}>
        <ThunderboltOutlined style={{ fontSize: 48, marginBottom: 16 }} />
        <div style={{ fontSize: 14 }}>选择一个会话查看流水线状态</div>
      </div>
    );
  }

  if (loading && !pipeline) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin indicator={<LoadingOutlined style={{ color: 'var(--ant-color-primary)' }} />} />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Empty description="暂无流水线数据" />
      </div>
    );
  }

  return (
    <div>
      {/* 标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ant-color-text)' }}>
            {pipeline.pipeline_name || pipeline.pipeline_type} · {currentGate}
          </span>
          <Tag style={{ marginLeft: 8, borderRadius: 12, backgroundColor: 'var(--ant-color-primary-bg)', color: 'var(--ant-color-primary)', border: 'none' }}>
            {pipeline.platform}
          </Tag>
        </div>
        <Button
          icon={<QuestionCircleOutlined />}
          onClick={() => setHelpOpen(true)}
          style={{ borderRadius: 18, color: 'var(--ant-color-primary)' }}
        >
          操作指南
        </Button>
      </div>

      {/* G6 流程可视化 */}
      <div style={{ marginBottom: 16 }}>
        <ErrorBoundary fallback={<Alert type="error" message="G6 流程可视化 加载失败" showIcon style={{ borderRadius: 12 }} />}>
          <G6FlowChart
            runId={runId}
            agentStatus={agentStatus}
            pipelineGates={gates.map(g => ({ gate: g.gate, passed: g.passed }))}
          />
        </ErrorBoundary>
      </div>

      {/* Token 消耗统计 */}
      <ErrorBoundary fallback={<Alert type="error" message="Token 仪表盘 加载失败" showIcon style={{ borderRadius: 12 }} />}>
        <TokenDashboard runId={runId} agentUsage={agentUsage} loading={agentLoading} />
      </ErrorBoundary>

      {/* 统计卡片 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={4} lg={4}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic title="完成进度" value={progressPct} suffix="%" styles={{ content: { color: 'var(--ant-color-primary)', fontSize: 24 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5} lg={5}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic title="已通过 Gate" value={`${completedGates}/${totalGates}`} styles={{ content: { color: 'var(--ant-color-primary)', fontSize: 24 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5} lg={5}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic title="当前阶段" value={currentGate} styles={{ content: { color: 'var(--ant-color-primary)', fontSize: 24 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5} lg={5}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic title="产物文件" value={totalArtifacts} suffix="个" styles={{ content: { color: 'var(--ant-color-primary)', fontSize: 24 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5} lg={5}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic title="总耗时" value={durationDisplay} styles={{ content: { color: 'var(--ant-color-primary)', fontSize: 24 } }} />
          </Card>
        </Col>
      </Row>

      {/* Gate 进度条 + Gate 步骤列表 */}
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <Card
            title={<span style={{ fontWeight: 600, color: 'var(--ant-color-text)' }}>Gate 进度</span>}
            size="small"
            style={{ borderRadius: 18, marginBottom: 12 }}
          >
            <Progress
              percent={progressPct}
              strokeColor="var(--ant-color-primary)"
              railColor="var(--ant-color-fill-tertiary)"
              style={{ marginBottom: 16 }}
            />
            <Timeline
              items={gates.map(g => {
                const sg = shortGate(g.gate);
                const color = GATE_COLORS[sg] || 'var(--ant-color-primary)';
                const passed = g.passed;
                const isCurrent = g.gate === currentGate;
                return {
                  color: passed ? 'var(--ant-color-success)' : isCurrent ? 'var(--ant-color-primary)' : 'var(--ant-color-text)',
                  icon: <span style={{ fontSize: 18, lineHeight: 1 }}>
                    {passed ? <CheckCircleOutlined /> : isCurrent ? <LoadingOutlined /> : <ClockCircleOutlined />}
                  </span>,
                  content: (
                    <div
                      onClick={() => {
                        if (g.artifacts?.length) {
                          const firstMd = g.artifacts.find(a => a.endsWith('.md'));
                          if (firstMd) openDoc(firstMd, g.gate);
                        }
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 12,
                        backgroundColor: isCurrent ? 'var(--ant-color-primary-bg)' : 'transparent',
                        border: isCurrent ? '2px solid var(--ant-color-primary)' : '1px solid var(--ant-color-border)',
                        cursor: g.artifacts?.length ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color, fontWeight: 700, fontSize: 15 }}>{g.gate}</span>
                        <span style={{ color: 'var(--ant-color-text)', fontSize: 12 }}>
                          {GATE_LABELS[sg] || sg}
                        </span>
                        {passed && <Tag color="var(--ant-color-success)" style={{ borderRadius: 8 }}>已通过</Tag>}
                        {isCurrent && <Tag color="var(--ant-color-primary)" style={{ borderRadius: 8 }}>进行中</Tag>}
                      </div>
                      {GATE_DESCRIPTIONS[g.gate] && (
                        <div style={{ fontSize: 11, color: 'var(--ant-color-text)', opacity: 0.5, marginTop: 2 }}>
                          {GATE_DESCRIPTIONS[g.gate]}
                        </div>
                      )}
                      {g.entered_at && (
                        <div style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.5, marginTop: 4 }}>
                          进入: {formatTime(g.entered_at)}
                          {g.duration_display && ` · 耗时: ${g.duration_display}`}
                        </div>
                      )}
                      {g.artifacts && g.artifacts.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {g.artifacts.map((a, i) => (
                            <Tag
                              key={i}
                              style={{ borderRadius: 8, fontSize: 10, cursor: 'pointer' }}
                              color="var(--ant-color-primary)"
                              onClick={(e) => { e.stopPropagation(); openDoc(a, g.gate); }}
                            >
                              {a}
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
        </Col>
        <Col xs={24} lg={10}>
          {/* 历史 Runs */}
          <Card
            title={
              <span style={{ fontWeight: 600, color: 'var(--ant-color-text)' }}>
                <HistoryOutlined style={{ marginRight: 6 }} />历史 Runs · {runs.length}
              </span>
            }
            size="small"
            style={{ borderRadius: 18, marginBottom: 12 }}
          >
            {runs.length === 0 ? (
              <Empty description="暂无历史记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {runs.map(r => {
                  const st = RUN_STATUS[r.status] || { label: r.status, color: 'var(--ant-color-text)', bgColor: 'var(--ant-color-fill-quaternary)' };
                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: '8px 12px', borderRadius: 12, marginBottom: 4,
                        border: '1px solid var(--ant-color-border)', fontSize: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ant-color-text)' }}>
                          {r.task_name || '未命名'}
                        </span>
                        <Tag style={{ borderRadius: 8, fontSize: 10, backgroundColor: st.bgColor, color: st.color, border: 'none' }}>
                          {st.label}
                        </Tag>
                      </div>
                      <div style={{ color: 'var(--ant-color-text)', opacity: 0.5, fontSize: 10, marginTop: 2 }}>
                        {r.pipeline_type} · {r.current_gate} · {formatTime(r.started_at)}
                        {r.total_duration_display && ` · ${r.total_duration_display}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 文档抽屉 */}
      <Drawer
        title={<span style={{ fontWeight: 600, color: 'var(--ant-color-text)', fontSize: 14 }}>{docDrawer.title}</span>}
        open={docDrawer.open}
        onClose={() => setDocDrawer({ open: false, content: '', title: '' })}
        size={560}
        maxSize={900}
        resizable
        styles={{ body: { background: 'var(--ant-color-bg-container)' } }}
      >
        <div className="markdown-body">
          <ErrorBoundary>
            <React.Suspense fallback={<Spin />}>
              <LazyMarkdown content={docDrawer.content} />
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </Drawer>

      {/* 帮助弹窗 */}
      <Modal
        title={<span style={{ fontWeight: 600, color: 'var(--ant-color-text)' }}>操作指南</span>}
        open={helpOpen}
        onCancel={() => setHelpOpen(false)}
        footer={null}
        width={420}
      >
        <Timeline
          items={[
            { color: 'var(--ant-color-primary)', content: <strong>启动任务</strong> },
            { color: 'var(--ant-color-primary)', content: '在 Claude Code / OpenCode / Codex 中输入 /jarvis 命令' },
            { color: 'var(--ant-color-primary)', content: <strong>等待 Gate 通过</strong> },
            { color: 'var(--ant-color-primary)', content: '每个 Gate 完成后自动推进，可点击产物文件查看输出' },
            { color: 'var(--ant-color-primary)', content: <strong>查看最终结果</strong> },
          ]}
        />
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ant-color-text)', opacity: 0.6 }}>
          命令对照：
          <Tag style={{ borderRadius: 8, marginLeft: 4 }} color="var(--ant-color-primary)">/jarvis</Tag> 全流程 ·
          <Tag style={{ borderRadius: 8, marginLeft: 4 }} color="var(--ant-color-error)">/frontend</Tag> 前端 ·
          <Tag style={{ borderRadius: 8, marginLeft: 4 }} color="var(--ant-color-success)">/backend</Tag> 后端 ·
          <Tag style={{ borderRadius: 8, marginLeft: 4 }} color="var(--ant-color-text)">/jarvis-lite</Tag> 轻量
        </div>
      </Modal>
    </div>
  );
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
