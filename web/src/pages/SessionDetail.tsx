import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Progress, Tag, Button, Empty, Spin, Timeline, Statistic, Breadcrumb, message, Table,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined,
  ThunderboltOutlined, LoadingOutlined, FileSearchOutlined, CloseOutlined,
  HomeOutlined, HistoryOutlined,
} from '@ant-design/icons';
import type { PipelineSession, PipelineRun } from '../api';
import { api } from '../api';
import { usePipelineData } from '../components/Layout';
import ErrorBoundary from '../components/ErrorBoundary';
import { MARKDOWN_CSS, LazyMarkdown, GATE_COLORS, GATE_LABELS, GATE_DESCRIPTIONS, shortGate } from './Dashboard';

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

function formatTime(ts: string | null | undefined): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { pipeline: ssePipeline } = usePipelineData();
  const [pipeline, setPipeline] = useState<PipelineSession | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [mdPreview, setMdPreview] = useState<{ open: boolean; content: string; title: string }>({
    open: false, content: '', title: '',
  });

  useEffect(() => {
    const id = 'markdown-custom-style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = MARKDOWN_CSS;
      document.head.appendChild(style);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [sessions, runList] = await Promise.all([
        api.pipeline(),
        api.pipelineRuns(sessionId),
      ]);
      setPipeline(sessions.find(s => s.session_id === sessionId) || null);
      setRuns(runList || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  // SSE 实时更新：当推送的 pipeline 匹配当前 session 时刷新
  useEffect(() => {
    if (ssePipeline && ssePipeline.session_id === sessionId) {
      setPipeline(ssePipeline);
    }
  }, [ssePipeline, sessionId]);

  const openMdPreview = async (filepath: string) => {
    try {
      const sanitized = filepath.replace(/\.\.\/|\.\.\\/g, '');
      const content = await api.docContent(sanitized, sessionId);
      setMdPreview({ open: true, content, title: filepath });
    } catch { message.error('文档加载失败'); }
  };

  const { gates, completedGates, totalGates, progressPct, currentGate, totalArtifacts } = useMemo(() => {
    const g = pipeline?.gates || [];
    const completed = g.filter(x => x.passed).length;
    const total = g.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const cur = pipeline?.current_gate || '?';
    const artifacts = g.reduce((s, x) => s + (x.artifacts?.length || 0), 0);
    return { gates: g, completedGates: completed, totalGates: total, progressPct: pct, currentGate: cur, totalArtifacts: artifacts };
  }, [pipeline?.gates, pipeline?.current_gate]);

  if (!sessionId) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--ant-color-text)', opacity: 0.4 }}>
        <ThunderboltOutlined style={{ fontSize: 48, marginBottom: 16 }} />
        <div style={{ fontSize: 14 }}>未指定会话 ID</div>
      </div>
    );
  }

  if (loading && !pipeline && runs.length === 0) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin indicator={<LoadingOutlined style={{ color: 'var(--ant-color-primary)' }} />} /></div>;
  }

  const hasPipeline = !!pipeline;
  const hasRuns = runs.length > 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <Breadcrumb style={{ marginBottom: 10, flexShrink: 0 }} items={[
        { title: <><HomeOutlined /><a onClick={() => navigate('/')}> 首页</a></> },
        { title: pipeline?.pipeline_name || sessionId.slice(0, 8) },
      ]} />

      {hasPipeline && (
        <>
          {/* 标题栏 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ant-color-text)' }}>
                {pipeline!.pipeline_name || pipeline!.pipeline_type} · {currentGate}
              </span>
              <Tag style={{ marginLeft: 8, borderRadius: 12, backgroundColor: 'var(--ant-color-primary-bg)', color: 'var(--ant-color-primary)', border: 'none' }}>
                {pipeline!.platform}
              </Tag>
            </div>
          </div>

          {/* 统计卡片 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, flexShrink: 0 }}>
            <Card size="small" style={{ flex: '1 1 0', minWidth: 100, borderRadius: 14 }}>
              <Statistic title="完成进度" value={progressPct} suffix="%" styles={{ content: { color: 'var(--ant-color-primary)', fontSize: 18 } }} />
            </Card>
            <Card size="small" style={{ flex: '1 1 0', minWidth: 100, borderRadius: 14 }}>
              <Statistic title="已通过 Gate" value={`${completedGates}/${totalGates}`} styles={{ content: { fontSize: 18 } }} />
            </Card>
            <Card size="small" style={{ flex: '1 1 0', minWidth: 100, borderRadius: 14 }}>
              <Statistic title="产物文件" value={totalArtifacts} suffix="个" styles={{ content: { fontSize: 18 } }} />
            </Card>
          </div>
        </>
      )}

      {!hasPipeline && !hasRuns && (
        <div style={{ textAlign: 'center', padding: 80 }}><Empty description="暂无流水线数据">
          <Button type="primary" onClick={loadData}>重新加载</Button>
        </Empty></div>
      )}

      {/* Run 历史 */}
      {hasRuns && (
        <Card size="small" style={{ borderRadius: 14, marginBottom: 10, flexShrink: 0 }}
          title={<span style={{ fontWeight: 600, fontSize: 13 }}><HistoryOutlined style={{ marginRight: 6 }} />Run 历史 · {runs.length} 条</span>}
        >
          <Table
            dataSource={runs}
            rowKey="id"
            size="small"
            pagination={false}
            onRow={(record) => ({
              onClick: () => navigate(`/archive/${record.id}`),
              style: { cursor: 'pointer' },
            })}
            columns={[
              {
                title: '任务', dataIndex: 'task_name', key: 'task_name',
                render: (t: string | null) => t || <span style={{ fontStyle: 'italic', opacity: 0.4 }}>未命名</span>,
              },
              {
                title: '状态', dataIndex: 'status', key: 'status', width: 80,
                render: (s: string) => (
                  <Tag color={s === 'completed' ? 'var(--ant-color-success)' : s === 'active' ? 'var(--ant-color-primary)' : 'var(--ant-color-text)'}
                    style={{ borderRadius: 6, fontSize: 10, margin: 0 }}>{s === 'completed' ? '已完成' : s === 'active' ? '进行中' : s}</Tag>
                ),
              },
              {
                title: 'Gate', dataIndex: 'current_gate', key: 'current_gate', width: 70,
                render: (g: string) => <Tag style={{ borderRadius: 6, fontSize: 10, margin: 0 }}>{g}</Tag>,
              },
              {
                title: '开始', dataIndex: 'started_at', key: 'started_at', width: 110,
                render: (t: string) => formatTime(t),
              },
              {
                title: '耗时', dataIndex: 'total_duration_display', key: 'duration', width: 80,
                render: (d: string | null) => d || '-',
              },
            ]}
          />
        </Card>
      )}

      {/* 内容区：中间文档预览区 + 右侧 Gate 时间线边栏 */}
      {hasPipeline && (
      <div style={{ flex: 1, display: 'flex', gap: 12, overflow: 'hidden', minHeight: 0 }}>
        {/* 中间：文档预览预留区域 */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          {mdPreview.open ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ant-color-text)' }}>
                  <FileSearchOutlined style={{ marginRight: 6 }} />{mdPreview.title}
                </span>
                <Button type="text" size="small" icon={<CloseOutlined />}
                  onClick={() => setMdPreview({ open: false, content: '', title: '' })} />
              </div>
              <div className="markdown-body" style={{ flex: 1, overflow: 'auto', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--ant-color-border-secondary)', background: 'var(--ant-color-bg-container)' }}>
                <ErrorBoundary>
                  <React.Suspense fallback={<Spin />}>
                    <LazyMarkdown content={mdPreview.content} />
                  </React.Suspense>
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <Card size="small" style={{ borderRadius: 14, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              styles={{ body: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } }}>
              <div style={{ textAlign: 'center', opacity: 0.45 }}>
                <FileSearchOutlined style={{ fontSize: 48, marginBottom: 12, color: 'var(--ant-color-text)' }} />
                <div style={{ fontSize: 14, color: 'var(--ant-color-text)', marginBottom: 4 }}>文档预览区域</div>
                <div style={{ fontSize: 12, color: 'var(--ant-color-text)' }}>点击右侧 Gate 上的文档标签即可在此预览</div>
              </div>
            </Card>
          )}
        </div>

        {/* 右侧边栏：Gate 流水线 + 产物文档 */}
        <div style={{ width: 340, flexShrink: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          <Card size="small" style={{ borderRadius: 14 }}
            title={<span style={{ fontWeight: 600, fontSize: 13 }}><FileTextOutlined style={{ marginRight: 6 }} />Gate 流水线</span>}
            extra={<Progress percent={progressPct} size="small" style={{ width: 100 }} strokeColor="var(--ant-color-primary)" />}
          >
            <Timeline
              items={gates.map(g => {
                const sg = shortGate(g.gate);
                const passed = g.passed;
                const isCurrent = g.gate === currentGate;
                const hasDocs = (g.artifacts || []).length > 0;
                return {
                  color: passed ? 'var(--ant-color-success)' : isCurrent ? 'var(--ant-color-primary)' : 'var(--ant-color-text)',
                  icon: passed ? <CheckCircleOutlined style={{ fontSize: 14 }} /> :
                       isCurrent ? <LoadingOutlined style={{ fontSize: 14 }} /> :
                       <ClockCircleOutlined style={{ fontSize: 14 }} />,
                  children: (
                    <div style={{
                      padding: '8px 12px', borderRadius: 10,
                      backgroundColor: isCurrent ? 'var(--ant-color-primary-bg)' : 'transparent',
                      border: isCurrent ? '2px solid var(--ant-color-primary)' : '1px solid var(--ant-color-border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: GATE_COLORS[sg] || 'var(--ant-color-primary)' }}>{g.gate}</span>
                        <span style={{ fontSize: 11 }}>{GATE_LABELS[sg] || sg}</span>
                        {passed && <Tag color="var(--ant-color-success)" style={{ borderRadius: 6, fontSize: 10, margin: 0, lineHeight: '16px' }}>✓</Tag>}
                        {isCurrent && <Tag color="var(--ant-color-primary)" style={{ borderRadius: 6, fontSize: 10, margin: 0, lineHeight: '16px' }}>进行中</Tag>}
                      </div>
                      {GATE_DESCRIPTIONS[g.gate] && (
                        <div style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.45, marginTop: 2 }}>{GATE_DESCRIPTIONS[g.gate]}</div>
                      )}
                      {g.entered_at && (
                        <div style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.4, marginTop: 2 }}>
                          进入: {formatTime(g.entered_at)}{g.duration_display ? ` · 耗时: ${g.duration_display}` : ''}
                        </div>
                      )}
                      {hasDocs && (
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {g.artifacts.map((a: string, i: number) => (
                            <Card key={i} size="small" hoverable
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); openMdPreview(a); }}
                              style={{ borderRadius: 8, cursor: 'pointer' }}
                              styles={{ body: { padding: '6px 10px' } }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileTextOutlined style={{ color: 'var(--ant-color-primary)', fontSize: 12, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {a.split('/').pop()}
                                </span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                };
              })}
            />
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
