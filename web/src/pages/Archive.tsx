import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Input, Button, Tag, Empty, Spin, message, Modal,
} from 'antd';
import {
  SearchOutlined, UndoOutlined, DeleteOutlined,
  FolderOpenOutlined, LoadingOutlined,
} from '@ant-design/icons';
import type { PipelineRun } from '../api';
import { api } from '../api';

const CMD_LABELS: Record<string, { label: string; color: string }> = {
  full: { label: 'jarvis', color: 'var(--ant-color-success)' },
  frontend: { label: 'frontend', color: 'var(--ant-color-error)' },
  backend: { label: 'backend', color: 'var(--ant-color-success)' },
  lite: { label: 'jarvis-lite', color: 'var(--ant-color-text)' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: '进行中', color: 'var(--ant-color-success)' },
  completed: { label: '已完成', color: 'var(--ant-color-success)' },
  failed: { label: '失败', color: 'var(--ant-color-error)' },
  archived: { label: '已归档', color: 'var(--ant-color-text)' },
};

function formatTime(ts: string | null | undefined): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

export default function Archive() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.archivedRuns();
      setRuns(d || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (runId: string) => {
    try {
      const r = await api.unarchiveRun(runId);
      if (r.ok) {
        message.success('已恢复');
        setRuns(prev => prev.filter(r => r.id !== runId));
      } else {
        message.error(r.error || '恢复失败');
      }
    } catch {
      message.error('恢复失败');
    }
  };

  const handleDelete = (runId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，确定要继续？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const r = await api.deleteRun(runId);
          if (r.ok) {
            message.success('已删除');
            setRuns(prev => prev.filter(r => r.id !== runId));
          } else {
            message.error(r.error || '删除失败');
          }
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  // 过滤
  const filtered = search
    ? runs.filter(r =>
        (r.task_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.session_id || '').toLowerCase().includes(search.toLowerCase())
      )
    : runs;

  // 按 session_id 分组
  const grouped = new Map<string, PipelineRun[]>();
  for (const r of filtered) {
    const sid = r.session_id || 'unknown';
    if (!grouped.has(sid)) grouped.set(sid, []);
    grouped.get(sid)!.push(r);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ant-color-text)' }}>
          <FolderOpenOutlined style={{ marginRight: 6 }} />归档记录
        </span>
        <Input
          size="small"
          placeholder="搜索任务名称或 Session ID..."
          prefix={<SearchOutlined style={{ color: 'var(--ant-color-text)' }} />}
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 260, borderRadius: 12 }}
        />
      </div>

      {search && (
        <div style={{ fontSize: 12, color: 'var(--ant-color-text)', opacity: 0.5, marginBottom: 8 }}>
          搜索 "{search}" — 匹配 {filtered.length} 条
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin indicator={<LoadingOutlined style={{ color: 'var(--ant-color-primary)' }} />} />
        </div>
      ) : filtered.length === 0 ? (
        <Empty description={search ? '未找到匹配的归档记录' : '暂无归档记录'} />
      ) : (
        [...grouped.entries()].map(([sid, items]) => (
          <Card
            key={sid}
            size="small"
            title={
              <span style={{ fontWeight: 600, color: 'var(--ant-color-text)', fontSize: 13 }}>
                {shortId(sid)} · {items.length} 条记录
              </span>
            }
            style={{ borderRadius: 18, marginBottom: 8 }}
          >
            {items.map(r => {
              const cmd = CMD_LABELS[r.pipeline_type] || CMD_LABELS.full;
              const st = STATUS_LABELS[r.status] || STATUS_LABELS.archived;
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 12, marginBottom: 4,
                    border: '1px solid var(--ant-color-border-secondary)', fontSize: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--ant-color-text)' }}>
                      {r.task_name || <span style={{ fontStyle: 'italic', opacity: 0.4 }}>未命名</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                      <Tag style={{ fontSize: 9, borderRadius: 8, backgroundColor: `color-mix(in srgb, ${cmd.color} 12.5%, transparent)`, color: cmd.color, border: 'none' }}>
                        {cmd.label}
                      </Tag>
                      <Tag style={{ fontSize: 9, borderRadius: 8, backgroundColor: 'var(--ant-color-bg-container)', color: 'var(--ant-color-text)', border: '1px solid var(--ant-color-primary)' }}>
                        {r.pipeline_type}
                      </Tag>
                      <Tag style={{ fontSize: 9, borderRadius: 8, backgroundColor: `color-mix(in srgb, ${st.color} 12.5%, transparent)`, color: st.color, border: 'none' }}>
                        {st.label}
                      </Tag>
                      <span style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.4 }}>
                        {shortId(r.id)} · {formatTime(r.started_at)}
                        {r.total_duration_display && ` · ${r.total_duration_display}`}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <Button
                      size="small"
                      icon={<UndoOutlined />}
                      onClick={() => handleRestore(r.id)}
                      style={{ borderRadius: 12, color: 'var(--ant-color-primary)' }}
                    >
                      恢复
                    </Button>
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(r.id)}
                      style={{ borderRadius: 12, color: 'var(--ant-color-error)' }}
                      danger
                    >
                      删除
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        ))
      )}
    </div>
  );
}
