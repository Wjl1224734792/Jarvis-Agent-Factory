import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Timeline, Table, Spin, Button, Breadcrumb, message, Modal } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import ErrorBoundary from '../components/ErrorBoundary';
import { api } from '../api';
import { MARKDOWN_CSS, LazyMarkdown } from './Dashboard';

interface RunDetail {
  run: {
    id: string; session_id: string; project: string; task_name: string | null;
    pipeline_type: string; current_gate: string; status: string;
    started_at: string; completed_at: string | null;
    total_duration_seconds: number | null; total_duration_display: string | null;
    archived: number; pinned: number;
  };
  gates: Array<{
    gate: string; passed: boolean; passed_at: string | null;
    duration_seconds: number | null; duration_display: string | null;
    artifacts: Array<{ filepath: string; created_at: string }>;
  }>;
  documents: Array<{ filepath: string; gate: string; created_at: string }>;
  events: Array<{ id: number; event_type: string; gate: string | null; detail: string | null; created_at: string }>;
  pipeline_name: string; pipeline_type: string;
}

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  useEffect(() => {
    if (!runId) return;
    api.runDetail(runId)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [runId]);

  const openMdPreview = async (filepath: string) => {
    try {
      const sanitized = filepath.replace(/\.\.\/|\.\.\\/g, '');
      const content = await api.docContent(sanitized, data?.run?.session_id);
      setMdPreview({ open: true, content, title: filepath });
    } catch { message.error('文档加载失败'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (error) return <div style={{ textAlign: 'center', padding: 80, color: '#ff4d4f' }}>加载失败: {error}</div>;
  if (!data) return null;

  const { run, gates, documents, events, pipeline_name } = data;

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '0 4px' }}>
      <Breadcrumb style={{ marginBottom: 12 }}
        items={[
          { title: <a onClick={() => navigate('/')}>首页</a> },
          { title: <a onClick={() => navigate('/archive')}>归档</a> },
          { title: run.task_name || run.id },
        ]}
      />

      <Card title={<span><CheckCircleOutlined style={{ color: run.status === 'completed' ? '#52c41a' : '#faad14' }} /> {run.task_name || '未命名任务'}</span>}
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/archive')}>返回</Button>}
        style={{ marginBottom: 12 }}>
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="流水线">{pipeline_name}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color={run.status === 'completed' ? 'green' : 'orange'}>{run.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="项目">{run.project}</Descriptions.Item>
          <Descriptions.Item label="开始时间">{new Date(run.started_at).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="完成时间">{run.completed_at ? new Date(run.completed_at).toLocaleString() : '-'}</Descriptions.Item>
          <Descriptions.Item label="总耗时">{run.total_duration_display || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Gate 流水线" style={{ marginBottom: 12 }}>
        <Timeline items={gates.map(g => ({
          color: g.passed ? 'green' : 'gray',
          children: (
            <div>
              <strong>{g.gate}</strong>
              {g.passed && <span style={{ marginLeft: 8, color: '#52c41a' }}>✓ {g.passed_at?.slice(0, 10)}</span>}
              {g.duration_display && <span style={{ marginLeft: 8, color: '#999' }}>耗时: {g.duration_display}</span>}
              {g.artifacts.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {g.artifacts.map(a => (
                    <Tag key={a.filepath} color="blue" style={{ marginBottom: 4, cursor: 'pointer' }}
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); openMdPreview(a.filepath); }}>
                      {a.filepath.split('/').pop()}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          ),
        }))} />
      </Card>

      <Card title={<span><FileTextOutlined style={{ marginRight: 6 }} />产物文档</span>} style={{ marginBottom: 12 }}>
        {documents.length === 0 ? <span style={{ color: '#999' }}>暂无产物文档</span> : (
          <Table dataSource={documents} pagination={false} size="small" rowKey="filepath"
            onRow={(record) => ({
              onClick: () => openMdPreview(record.filepath),
              style: { cursor: 'pointer' },
            })}
            columns={[
              { title: '文档路径', dataIndex: 'filepath', key: 'filepath', render: (t: string) => <a>{t}</a> },
              { title: 'Gate', dataIndex: 'gate', key: 'gate', render: (t: string) => <Tag>{t}</Tag> },
              { title: '创建时间', dataIndex: 'created_at', key: 'created_at',
                render: (t: string) => t ? new Date(t).toLocaleString() : '-' },
            ]} />
        )}
      </Card>

      {events.length > 0 && (
        <Card title="事件日志">
          <Table dataSource={events} pagination={false} size="small" rowKey="id"
            columns={[
              { title: '事件', dataIndex: 'event_type', key: 'event_type', render: (t: string) => <Tag>{t}</Tag> },
              { title: '详情', dataIndex: 'detail', key: 'detail' },
              { title: '时间', dataIndex: 'created_at', key: 'created_at',
                render: (t: string) => t ? new Date(t).toLocaleString() : '-' },
            ]} />
        </Card>
      )}

      {/* Markdown 预览浮层 */}
      <Modal title={mdPreview.title} open={mdPreview.open} onCancel={() => setMdPreview({ open: false, content: '', title: '' })}
        footer={null} width={800} destroyOnClose>
        <div className="markdown-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <ErrorBoundary>
            <React.Suspense fallback={<Spin />}>
              <LazyMarkdown content={mdPreview.content} />
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </Modal>
    </div>
  );
}
