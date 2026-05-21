import React, { useEffect, useState } from 'react';
import { Card, Tag, Row, Col, Statistic, Spin, Empty, Progress } from 'antd';
import {
  ThunderboltOutlined, DashboardOutlined, RobotOutlined,
  FolderOpenOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api, Session, PipelineSession, PipelineRun } from '../api';
import { usePipelineData } from '../components/Layout';

const PIPELINE_NAMES: Record<string, string> = {
  full: '全流程', frontend: '前端', backend: '后端', lite: '轻量',
  refactor: '重构', hotfix: '紧急热修复', migrate: '框架迁移',
  evaluate: '技术评估', debug: '调试诊断',
};

const PIPELINE_COLORS: Record<string, string> = {
  full: '#52c41a', frontend: '#ff4d4f', backend: '#1677ff', lite: '#faad14',
  refactor: '#722ed1', hotfix: '#cf1322', migrate: '#531dab',
  evaluate: '#006d75', debug: '#d46b08',
};

export default function DashboardHome() {
  const navigate = useNavigate();
  const { pipeline: ssePipeline, runs: sseRuns } = usePipelineData();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pipelines, setPipelines] = useState<Map<string, PipelineSession>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.sessions(),
      api.pipeline(),
    ]).then(([sessionList, pipelineList]) => {
      setSessions(sessionList);
      const pipeMap = new Map<string, PipelineSession>();
      for (const p of pipelineList) {
        pipeMap.set(p.session_id, p);
      }
      setPipelines(pipeMap);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // SSE 同步更新
  useEffect(() => {
    if (ssePipeline && sseRuns) {
      setPipelines(prev => {
        const next = new Map(prev);
        next.set(ssePipeline.session_id, ssePipeline);
        return next;
      });
    }
  }, [ssePipeline, sseRuns]);

  const activeSessions = sessions.filter(s => s.status === 'active');
  const inactiveSessions = sessions.filter(s => s.status === 'inactive');

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '0 4px' }}>
      {/* 统计摘要 */}
      <h2 style={{ marginBottom: 16 }}><DashboardOutlined style={{ marginRight: 8 }} />流水线看板</h2>
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        {[
          { title: '总会话', value: sessions.length, icon: <FolderOpenOutlined />, color: '#1677ff' },
          { title: '活跃', value: activeSessions.length, icon: <ThunderboltOutlined />, color: '#52c41a' },
          { title: '休眠', value: inactiveSessions.length, icon: <RobotOutlined />, color: '#999' },
        ].map((s, i) => (
          <Col xs={8} key={i}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic title={s.title} value={s.value} prefix={s.icon}
                styles={{ content: { color: s.color, fontSize: 18 } }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 活跃会话卡片 */}
      {sessions.length === 0 ? (
        <Empty description="等待会话连接..." style={{ paddingTop: 40 }} />
      ) : (
        <>
          {activeSessions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--ant-color-text)' }}>
                <ThunderboltOutlined style={{ marginRight: 6, color: '#52c41a' }} />活跃会话 · {activeSessions.length}
              </h3>
              <Row gutter={[10, 10]}>
                {activeSessions.map(s => {
                  const pipe = pipelines.get(s.id);
                  const gates = pipe?.gates || [];
                  const completed = gates.filter(g => g.passed).length;
                  const pct = gates.length > 0 ? Math.round((completed / gates.length) * 100) : 0;
                  const pt = s.pipeline_type || 'full';
                  return (
                    <Col xs={24} sm={12} lg={8} xl={6} key={s.id}>
                      <Card
                        size="small"
                        hoverable
                        onClick={() => navigate(`/session/${encodeURIComponent(s.id)}`)}
                        style={{ borderRadius: 14, height: '100%' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {s.task_name || (s.platform === 'claude' ? 'Claude' : s.platform) + ' · 会话'}
                          </span>
                          <Tag style={{ borderRadius: 10, fontSize: 10, marginLeft: 4, backgroundColor: 'var(--ant-color-success-bg)', color: 'var(--ant-color-success)', border: 'none' }}>
                            活跃
                          </Tag>
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                          <Tag color={PIPELINE_COLORS[pt]} style={{ borderRadius: 8, fontSize: 10, margin: 0 }}>
                            {PIPELINE_NAMES[pt] || pt}
                          </Tag>
                          <Tag style={{ borderRadius: 8, fontSize: 10, margin: 0 }}>{s.gate || '?'}</Tag>
                        </div>
                        <Progress percent={pct} size="small" strokeColor={PIPELINE_COLORS[pt] || '#1677ff'}
                          format={() => `${completed}/${gates.length}`} />
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}

          {inactiveSessions.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--ant-color-text)', opacity: 0.6 }}>
                <CheckCircleOutlined style={{ marginRight: 6 }} />休眠会话 · {inactiveSessions.length}
              </h3>
              <Row gutter={[10, 10]}>
                {inactiveSessions.slice(0, 8).map(s => {
                  const pt = s.pipeline_type || 'full';
                  return (
                    <Col xs={24} sm={12} lg={8} xl={6} key={s.id}>
                      <Card size="small" hoverable onClick={() => navigate(`/session/${encodeURIComponent(s.id)}`)}
                        style={{ borderRadius: 14, opacity: 0.55 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.task_name || s.platform + ' · 会话'}
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                          <Tag color={PIPELINE_COLORS[pt]} style={{ borderRadius: 8, fontSize: 10, margin: 0 }}>
                            {PIPELINE_NAMES[pt] || pt}
                          </Tag>
                          <Tag style={{ borderRadius: 8, fontSize: 10, margin: 0 }}>{s.gate || '?'}</Tag>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}
        </>
      )}
    </div>
  );
}
