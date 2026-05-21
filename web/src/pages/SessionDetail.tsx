import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Progress, Tag, Button, Empty, Spin, Timeline, Statistic, Breadcrumb, message,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined,
  ThunderboltOutlined, LoadingOutlined, FileSearchOutlined, CloseOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import type { PipelineSession } from '../api';
import { api } from '../api';
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
  const [pipeline, setPipeline] = useState<PipelineSession | null>(null);
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
      const sessions = await api.pipeline();
      setPipeline(sessions.find(s => s.session_id === sessionId) || null);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openMdPreview = async (filepath: string) => {
    try {
      const sanitized = filepath.replace(/\.\.\/|\.\.\\/g, '');
      const content = await api.docContent(sanitized);
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

  if (loading && !pipeline) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin indicator={<LoadingOutlined style={{ color: 'var(--ant-color-primary)' }} />} /></div>;
  }

  if (!pipeline) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}><Empty description="暂无流水线数据">
        <Button type="primary" onClick={loadData}>重新加载</Button>
      </Empty></div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <Breadcrumb style={{ marginBottom: 10, flexShrink: 0 }} items={[
        { title: <><HomeOutlined /><a onClick={() => navigate('/')}> 首页</a></> },
        { title: pipeline.pipeline_name || sessionId.slice(0, 8) },
      ]} />

      {/* 标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ant-color-text)' }}>
            {pipeline.pipeline_name || pipeline.pipeline_type} · {currentGate}
          </span>
          <Tag style={{ marginLeft: 8, borderRadius: 12, backgroundColor: 'var(--ant-color-primary-bg)', color: 'var(--ant-color-primary)', border: 'none' }}>
            {pipeline.platform}
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

      {/* 内容区：左侧 Gate 时间线 + 右侧文档预览 */}
      <div style={{ flex: 1, display: 'flex', gap: 12, overflow: 'hidden', minHeight: 0 }}>
        {/* 左侧：Gate 时间线 + 文档 */}
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
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
            <Card size="small" style={{ borderRadius: 14, height: '100%', overflow: 'auto' }}
              title={<span style={{ fontWeight: 600, fontSize: 13 }}><FileTextOutlined style={{ marginRight: 6 }} />Gate 流水线</span>}
              extra={<Progress percent={progressPct} size="small" style={{ width: 120 }} strokeColor="var(--ant-color-primary)" />}
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
                        cursor: hasDocs ? 'pointer' : 'default',
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
                          <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {g.artifacts.map((a: string, i: number) => (
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
          )}
        </div>

        {/* 右侧：当前 Gate 产物列表 */}
        <div style={{ width: 300, flexShrink: 0, overflow: 'auto' }}>
          <Card size="small" style={{ borderRadius: 14 }}
            title={<span style={{ fontWeight: 600, fontSize: 13 }}><FileTextOutlined style={{ marginRight: 6 }} />产物文档</span>}
            extra={(() => {
              const ca = gates.find(g => g.gate === currentGate);
              return ca ? <Tag style={{ borderRadius: 12, backgroundColor: 'var(--ant-color-primary-bg)', color: 'var(--ant-color-primary)', border: 'none' }}>{(ca.artifacts || []).length} 个</Tag> : null;
            })()}
          >
            {(() => {
              const curArtifacts = gates.find(g => g.gate === currentGate)?.artifacts || [];
              if (curArtifacts.length === 0) return <Empty description="暂无文档" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {curArtifacts.map((a: string) => (
                    <Card key={a} size="small" hoverable onClick={() => openMdPreview(a)}
                      style={{ borderRadius: 10, cursor: 'pointer' }}
                      styles={{ body: { padding: '10px 12px' } }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileTextOutlined style={{ color: 'var(--ant-color-primary)', fontSize: 14, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.split('/').pop()}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.45 }}>点击预览</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}
