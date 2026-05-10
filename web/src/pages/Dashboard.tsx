import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Row, Col, Progress, Tag, Drawer, Modal,
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

// API 返回的 gate 值含 "Gate " 前缀，如 "Gate A"、"Gate C1.5"
function shortGate(gate: string): string {
  return gate.startsWith('Gate ') ? gate.slice(5) : gate;
}

/** Gate 名称到文档子目录的映射 */
const GATE_DIRS: Record<string, string> = {
  'Gate A': 'requirements',
  'Gate B': 'tasks',
  'Gate B1': 'architecture',
  'Gate C': 'plans',
  'Gate C-impl': 'implementation',
  'Gate C1': 'implementation',
  'Gate C1.5': 'implementation',
  'Gate C2': 'testing',
  'Gate D': 'review',
  'Gate E': 'shipping',
};

const GATE_COLORS: Record<string, string> = {
  A: '#52C41A', B: '#52C41A', C: '#52C41A',
  C1: '#51CF66', 'C1.5': '#2C2C2C', C2: '#FA5252',
  D: '#52C41A', E: '#52C41A',
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

/** GitHub 风味 Markdown CSS，内联注入以避免外部样式依赖 */
const MARKDOWN_CSS = `
.markdown-body { font-size: 14px; line-height: 1.7; color: #2C2C2C; }
.markdown-body h1, .markdown-body h2, .markdown-body h3 { color: #2C2C2C; font-weight: 700; border-bottom: 2px solid #52C41A20; padding-bottom: 6px; }
.markdown-body h1 { font-size: 1.6em; }
.markdown-body h2 { font-size: 1.35em; }
.markdown-body h3 { font-size: 1.15em; }
.markdown-body table { border-collapse: collapse; width: 100%; }
.markdown-body th, .markdown-body td { border: 1px solid #2C2C2C; padding: 8px 12px; text-align: left; }
.markdown-body th { background: #52C41A20; font-weight: 700; }
.markdown-body tr:nth-child(even) { background: #FFF9F0; }
.markdown-body blockquote { border-left: 4px solid #52C41A; padding-left: 16px; color: #2C2C2C; margin: 12px 0; background: #52C41A08; padding: 8px 16px; border-radius: 0 8px 8px 0; }
.markdown-body code { background: #52C41A10; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; color: #2C2C2C; font-family: 'Consolas', 'Monaco', monospace; }
.markdown-body pre { background: #F5F5F5; border: 1px solid #2C2C2C; border-radius: 8px; padding: 16px; overflow-x: auto; }
.markdown-body pre code { background: transparent; padding: 0; border-radius: 0; }
.markdown-body ul, .markdown-body ol { padding-left: 24px; }
.markdown-body hr { border: none; border-top: 2px solid #2C2C2C; margin: 24px 0; }
.markdown-body a { color: #52C41A; font-weight: 600; }
.markdown-body img { max-width: 100%; border-radius: 8px; border: 1px solid #2C2C2C; }
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

const RUN_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: '进行中', color: '#52C41A' },
  completed: { label: '已完成', color: '#51CF66' },
  failed: { label: '失败', color: '#FA5252' },
  archived: { label: '已归档', color: '#2C2C2C' },
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

  const openDoc = async (filepath: string, gate?: string) => {
    try {
      const subdir = gate ? GATE_DIRS[gate] : null;
      if (gate && !subdir) {
        console.warn(`[Dashboard] 未知 Gate "${gate}"，无法确定文档子目录`);
        message.warning(`未知 Gate: ${gate}`);
        return;
      }
      // 前端路径消毒：移除 ../ 序列，防止路径遍历
      const sanitized = filepath.replace(/\.\.\/|\.\.\\/g, '');
      const fullPath = subdir ? `${subdir}/${sanitized}` : sanitized;
      const content = await api.docContent(fullPath);
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
      <div style={{ textAlign: 'center', padding: 80, color: '#2C2C2C', opacity: 0.4 }}>
        <ThunderboltOutlined style={{ fontSize: 48, marginBottom: 16 }} />
        <div style={{ fontSize: 14 }}>选择一个会话查看流水线状态</div>
      </div>
    );
  }

  if (loading && !pipeline) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin indicator={<LoadingOutlined style={{ color: '#52C41A' }} />} />
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
          <span style={{ fontSize: 18, fontWeight: 700, color: '#2C2C2C' }}>
            {pipeline.pipeline_name || pipeline.pipeline_type} · {currentGate}
          </span>
          <Tag style={{ marginLeft: 8, borderRadius: 12, backgroundColor: '#52C41A20', color: '#52C41A', border: 'none' }}>
            {pipeline.platform}
          </Tag>
        </div>
        <Button
          icon={<QuestionCircleOutlined />}
          onClick={() => setHelpOpen(true)}
          style={{ borderRadius: 18, color: '#52C41A' }}
        >
          操作指南
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={4} lg={4}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic title="完成进度" value={progressPct} suffix="%" styles={{ content: { color: '#52C41A', fontSize: 24 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5} lg={5}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic title="已通过 Gate" value={`${completedGates}/${totalGates}`} styles={{ content: { color: '#52C41A', fontSize: 24 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5} lg={5}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic title="当前阶段" value={currentGate} styles={{ content: { color: '#52C41A', fontSize: 24 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5} lg={5}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic title="产物文件" value={totalArtifacts} suffix="个" styles={{ content: { color: '#52C41A', fontSize: 24 } }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5} lg={5}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic title="总耗时" value={durationDisplay} styles={{ content: { color: '#52C41A', fontSize: 24 } }} />
          </Card>
        </Col>
      </Row>

      {/* Gate 进度条 + Gate 步骤列表 */}
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <Card
            title={<span style={{ fontWeight: 600, color: '#2C2C2C' }}>Gate 进度</span>}
            size="small"
            style={{ borderRadius: 18, marginBottom: 12 }}
          >
            <Progress
              percent={progressPct}
              strokeColor="#52C41A"
              railColor="#2C2C2C"
              style={{ marginBottom: 16 }}
            />
            <Timeline
              items={gates.map(g => {
                const sg = shortGate(g.gate);
                const color = GATE_COLORS[sg] || '#52C41A';
                const passed = g.passed;
                const isCurrent = g.gate === currentGate;
                return {
                  color: passed ? '#51CF66' : isCurrent ? '#52C41A' : '#2C2C2C',
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
                        backgroundColor: isCurrent ? '#52C41A10' : 'transparent',
                        border: isCurrent ? '2px solid #52C41A' : '1px solid #2C2C2C',
                        cursor: g.artifacts?.length ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color, fontWeight: 700, fontSize: 15 }}>{g.gate}</span>
                        <span style={{ color: '#2C2C2C', fontSize: 12 }}>
                          {GATE_LABELS[sg] || sg}
                        </span>
                        {passed && <Tag color="#51CF66" style={{ borderRadius: 8 }}>已通过</Tag>}
                        {isCurrent && <Tag color="#52C41A" style={{ borderRadius: 8 }}>进行中</Tag>}
                      </div>
                      {GATE_DESCRIPTIONS[g.gate] && (
                        <div style={{ fontSize: 11, color: '#2C2C2C', opacity: 0.5, marginTop: 2 }}>
                          {GATE_DESCRIPTIONS[g.gate]}
                        </div>
                      )}
                      {g.entered_at && (
                        <div style={{ fontSize: 10, color: '#2C2C2C', opacity: 0.5, marginTop: 4 }}>
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
                              color="#52C41A"
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
              <span style={{ fontWeight: 600, color: '#2C2C2C' }}>
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
                  const st = RUN_STATUS[r.status] || { label: r.status, color: '#2C2C2C' };
                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: '8px 12px', borderRadius: 12, marginBottom: 4,
                        border: '1px solid #2C2C2C', fontSize: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#2C2C2C' }}>
                          {r.task_name || '未命名'}
                        </span>
                        <Tag style={{ borderRadius: 8, fontSize: 10, backgroundColor: st.color + '20', color: st.color, border: 'none' }}>
                          {st.label}
                        </Tag>
                      </div>
                      <div style={{ color: '#2C2C2C', opacity: 0.5, fontSize: 10, marginTop: 2 }}>
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
        title={<span style={{ fontWeight: 600, color: '#2C2C2C', fontSize: 14 }}>{docDrawer.title}</span>}
        open={docDrawer.open}
        onClose={() => setDocDrawer({ open: false, content: '', title: '' })}
        size={560}
        resizable
        styles={{ body: { background: '#FFF9F0' } }}
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
        title={<span style={{ fontWeight: 600, color: '#2C2C2C' }}>操作指南</span>}
        open={helpOpen}
        onCancel={() => setHelpOpen(false)}
        footer={null}
        width={420}
      >
        <Timeline
          items={[
            { color: '#52C41A', content: <strong>启动任务</strong> },
            { color: '#52C41A', content: '在 Claude Code / OpenCode / Codex 中输入 /jarvis 命令' },
            { color: '#52C41A', content: <strong>等待 Gate 通过</strong> },
            { color: '#52C41A', content: '每个 Gate 完成后自动推进，可点击产物文件查看输出' },
            { color: '#52C41A', content: <strong>查看最终结果</strong> },
          ]}
        />
        <div style={{ marginTop: 12, fontSize: 12, color: '#2C2C2C', opacity: 0.6 }}>
          命令对照：
          <Tag style={{ borderRadius: 8, marginLeft: 4 }} color="#52C41A">/jarvis</Tag> 全流程 ·
          <Tag style={{ borderRadius: 8, marginLeft: 4 }} color="#FA5252">/frontend</Tag> 前端 ·
          <Tag style={{ borderRadius: 8, marginLeft: 4 }} color="#51CF66">/backend</Tag> 后端 ·
          <Tag style={{ borderRadius: 8, marginLeft: 4 }} color="#2C2C2C">/jarvis-lite</Tag> 轻量
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
