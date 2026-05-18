import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Spin } from 'antd';
import {
  CheckCircleOutlined, SyncOutlined, PauseCircleOutlined,
  ProjectOutlined, ApiOutlined, SettingOutlined, DashboardOutlined,
} from '@ant-design/icons';

interface DashStats {
  sessions: { total: number; active: number; inactive: number };
  runs: { total: number; completed: number; aborted: number; active: number };
  pipelines: Record<string, number>;
  gate_distribution: Record<string, number>;
  configured_agents: number;
  project: string;
  timestamp: string;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dashboard-stats')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setStats(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (error) return <div style={{ textAlign: 'center', padding: 80, color: '#ff4d4f' }}>引擎未连接: {error}</div>;
  if (!stats) return null;

  const pipelineEntries = Object.entries(stats.pipelines)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ pipeline: k, count: v }));

  const gateEntries = Object.entries(stats.gate_distribution)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ gate: k, sessions: v }));

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24 }}>
        <DashboardOutlined /> 数据看板 · {stats.project}
      </h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="总会话" value={stats.sessions.total}
              prefix={<ProjectOutlined />} />
            <div style={{ marginTop: 8, fontSize: 13, color: '#52c41a' }}>
              🟢 {stats.sessions.active} 活跃 · ⚪ {stats.sessions.inactive} 休眠
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="总运行记录" value={stats.runs.total}
              prefix={<CheckCircleOutlined />} />
            <div style={{ marginTop: 8, fontSize: 13 }}>
              ✅ {stats.runs.completed} 完成 · ❌ {stats.runs.aborted} 中止 · 🔵 {stats.runs.active} 活跃
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="流水线类型" value={Object.keys(stats.pipelines).length}
              prefix={<ApiOutlined />} />
            <div style={{ marginTop: 8, fontSize: 13, color: '#1890ff' }}>
              {pipelineEntries.slice(0, 3).map(e => `${e.pipeline}:${e.count}`).join(' · ')}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="已配置 Agent" value={stats.configured_agents}
              prefix={<SettingOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="流水线分布">
            <Table dataSource={pipelineEntries} pagination={false} size="small"
              columns={[
                { title: '类型', dataIndex: 'pipeline', key: 'pipeline',
                  render: (t: string) => <Tag>{t}</Tag> },
                { title: '会话数', dataIndex: 'count', key: 'count' },
              ]} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Gate 分布">
            <Table dataSource={gateEntries} pagination={false} size="small"
              columns={[
                { title: 'Gate', dataIndex: 'gate', key: 'gate',
                  render: (t: string) => <Tag color={t === 'Complete' ? 'green' : 'blue'}>{t}</Tag> },
                { title: '会话数', dataIndex: 'sessions', key: 'sessions' },
              ]} />
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 16, textAlign: 'right', color: '#999', fontSize: 12 }}>
        更新时间: {new Date(stats.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
