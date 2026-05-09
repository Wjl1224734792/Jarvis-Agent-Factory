import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Tag, Tooltip, Dropdown, message } from 'antd';
import {
  ThunderboltOutlined,
  DashboardOutlined,
  RobotOutlined,
  FolderOpenOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { api, Session } from '../api';

const { Header, Sider, Content } = Layout;

export const SessionContext = createContext<string | null>(null);
export function useSessionId() { return useContext(SessionContext); }

const PLATFORM_INFO: Record<string, { label: string; color: string }> = {
  claude: { label: 'Claude', color: '#225555' },
  opencode: { label: 'OpenCode', color: '#DA8787' },
  codex: { label: 'Codex', color: '#9CD3D3' },
};

const PIPELINE_NAMES: Record<string, string> = {
  full: '全流程',
  frontend: '前端',
  backend: '后端',
  lite: '轻量',
};

const CMD_LABELS: Record<string, { label: string; color: string }> = {
  full: { label: '/jarvis', color: '#225555' },
  frontend: { label: '/jarvis-fe', color: '#DA8787' },
  backend: { label: '/jarvis-be', color: '#9CD3D3' },
  lite: { label: '/jarvis-lite', color: '#CBC4AF' },
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

interface SessionItemProps {
  s: Session;
  active: boolean;
  onSelect: (id: string) => void;
  onResume: (id: string) => void;
  onPin: (runId: string, pinned: boolean) => void;
  onArchive: (runId: string) => void;
  onDelete: (runId: string) => void;
}

function SessionItem({ s, active, onSelect, onResume, onPin, onArchive, onDelete }: SessionItemProps) {
  const isInactive = s.status === 'inactive';
  const isPinned = !!s.pinned;
  const ptName = PIPELINE_NAMES[s.pipeline_type] || s.pipeline_type || '?';
  const cmd = CMD_LABELS[s.pipeline_type] || CMD_LABELS.full;
  const platformName = PLATFORM_INFO[s.platform]?.label || s.platform;
  const timeStr = s.heartbeat ? formatTime(s.heartbeat) : '';
  const fallbackTitle = `${platformName} · ${ptName}${timeStr ? ' · ' + timeStr : ''}`;
  const displayTitle = s.task_name || fallbackTitle;

  const menuItems: MenuProps['items'] = [
    ...(s.run_id ? [
      {
        key: 'pin',
        label: isPinned ? '取消置顶' : '置顶',
        onClick: () => onPin(s.run_id!, isPinned),
      },
      {
        key: 'archive',
        label: '归档',
        onClick: () => onArchive(s.run_id!),
      },
    ] : []),
    {
      key: 'delete',
      label: '删除',
      danger: true,
      onClick: () => onDelete(s.run_id || s.id),
    },
  ];

  return (
    <div
      onClick={() => onSelect(s.id)}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        borderRadius: 12,
        marginBottom: 2,
        backgroundColor: active ? '#e6f4f4' : 'transparent',
        borderLeft: active ? '3px solid #225555' : '3px solid transparent',
        borderTop: isPinned ? '2px solid #CBC4AF' : '2px solid transparent',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {isPinned && <span style={{ color: '#CBC4AF', fontSize: 10 }}>📌</span>}
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            backgroundColor: isInactive ? '#CBC4AF' : '#225555',
          }}
        />
        <span style={{
          fontSize: 12, fontWeight: 600, color: '#51463B',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {displayTitle}
        </span>
        {isInactive && (
          <Button
            type="text" size="small"
            icon={<CaretRightOutlined />}
            onClick={(e) => { e.stopPropagation(); onResume(s.id); }}
            style={{ color: '#225555', flexShrink: 0 }}
          />
        )}
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
          <Button
            type="text" size="small"
            onClick={(e) => e.stopPropagation()}
            style={{ color: '#51463B', flexShrink: 0, padding: '0 4px' }}
          >···</Button>
        </Dropdown>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
        <Tag style={{ fontSize: 10, margin: 0, borderRadius: 8, backgroundColor: cmd.color + '20', color: cmd.color, border: 'none' }}>
          {cmd.label}
        </Tag>
        <Tag style={{ fontSize: 10, margin: 0, borderRadius: 8, backgroundColor: '#FAFAEE', color: '#51463B', border: '1px solid #225555' }}>
          {s.gate || '?'}
        </Tag>
      </div>
    </div>
  );
}

const NAV_ITEMS: MenuProps['items'] = [
  { key: '/', icon: <DashboardOutlined />, label: '流水线看板' },
  { key: '/agents', icon: <RobotOutlined />, label: '智能体配置' },
  { key: '/archive', icon: <FolderOpenOutlined />, label: '归档记录' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [version, setVersion] = useState('?.?.?');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionPlatform, setSessionPlatform] = useState('all');
  const [mcpStatus, setMcpStatus] = useState<Record<string, { connected: boolean; active_sessions: number }>>({});
  const navigate = useNavigate();
  const location = useLocation();

  // 版本号
  useEffect(() => {
    api.health().then(h => setVersion(h.version || '?.?.?')).catch(() => {});
  }, []);

  // SSE 实时更新会话列表
  useEffect(() => {
    let evtSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (evtSource) evtSource.close();
      evtSource = new EventSource('/api/events');
      evtSource.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.sessions) {
            setSessions(d.sessions || []);
            if (!selectedSession && d.sessions.length > 0) {
              const active = d.sessions.find((s: Session) => s.status === 'active');
              setSelectedSession((active || d.sessions[0]).id);
            }
          }
        } catch {}
      };
      evtSource.onerror = () => {
        evtSource?.close();
        reconnectTimer = setTimeout(connect, 5000);
      };
    }
    connect();

    // MCP 状态定时刷新
    const statusTimer = setInterval(() => {
      api.status().then(d => {
        if (d?.connected_platforms) setMcpStatus(d.connected_platforms);
      }).catch(() => {});
    }, 8000);
    api.status().then(d => {
      if (d?.connected_platforms) setMcpStatus(d.connected_platforms);
    }).catch(() => {});

    return () => {
      evtSource?.close();
      clearTimeout(reconnectTimer);
      clearInterval(statusTimer);
    };
  }, []);

  const handlePin = useCallback(async (runId: string, pinned: boolean) => {
    const r = pinned ? await api.unpinRun(runId) : await api.pinRun(runId);
    if (r.ok) message.success(pinned ? '已取消置顶' : '已置顶');
  }, []);

  const handleArchive = useCallback(async (runId: string) => {
    const r = await api.archiveRun(runId);
    if (r.ok) message.success('已归档');
  }, []);

  const handleDelete = useCallback(async (runId: string) => {
    const r = await api.deleteRun(runId);
    if (r.ok) message.success('已删除');
  }, []);

  const handleResume = useCallback(async (sessionId: string) => {
    const r = await api.resumeSession(sessionId);
    if (r.ok) message.success('会话已恢复');
  }, []);

  const filteredSessions = sessionPlatform === 'all'
    ? sessions
    : sessions.filter(s => s.platform === sessionPlatform);

  // 排序：置顶优先 + 最近运行时间倒序
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    const aTime = a.latest_run_started_at || '';
    const bTime = b.latest_run_started_at || '';
    return bTime.localeCompare(aTime);
  });

  const activeCount = sessions.filter(s => s.status === 'active').length;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#FAFAEE',
        borderBottom: '2px solid #225555',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: 52,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#225555' }}
          />
          <ThunderboltOutlined style={{ fontSize: 20, color: '#225555' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#51463B', letterSpacing: -0.5 }}>
            Jarvis Engine
          </span>
          <Tag style={{ borderRadius: 12, backgroundColor: '#22555520', color: '#225555', border: 'none', fontSize: 11 }}>
            v{version}
          </Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={() => window.location.reload()}
            style={{ color: '#51463B' }}
          />
          <Tooltip title="MCP :3456 · 会话隔离模式">
            <Tag style={{ borderRadius: 12, backgroundColor: '#9CD3D320', color: '#225555', border: '1px solid #225555' }}>
              {activeCount} 活跃
            </Tag>
          </Tooltip>
        </div>
      </Header>
      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          width={260}
          style={{
            background: '#FAFAEE',
            borderRight: '2px solid #225555',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* 导航 */}
            <div style={{ padding: '12px 8px' }}>
              <Menu
                mode="inline"
                selectedKeys={[location.pathname]}
                items={NAV_ITEMS}
                onClick={({ key }) => navigate(key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontWeight: 600,
                }}
              />
            </div>

            {/* 平台筛选 */}
            {!collapsed && (
              <div style={{ padding: '0 12px 8px' }}>
                <div style={{ fontSize: 10, color: '#51463B', opacity: 0.5, marginBottom: 6, fontWeight: 600, letterSpacing: 1 }}>
                  平台筛选
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['all', 'claude', 'opencode', 'codex'].map(p => (
                    <Button
                      key={p}
                      size="small"
                      type={sessionPlatform === p ? 'primary' : 'default'}
                      onClick={() => setSessionPlatform(p)}
                      style={{
                        flex: 1,
                        fontSize: 10,
                        fontWeight: 600,
                        borderRadius: 12,
                      }}
                    >
                      {p === 'all' ? '全部' : PLATFORM_INFO[p]?.label || p}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 会话列表 */}
            {!collapsed && (
              <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
                <div style={{ fontSize: 10, color: '#51463B', opacity: 0.5, marginBottom: 6, fontWeight: 600, letterSpacing: 1, padding: '0 4px' }}>
                  会话列表 · {sortedSessions.length}
                </div>
                {sortedSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 16, color: '#51463B', opacity: 0.4, fontSize: 12 }}>
                    等待会话连接...
                  </div>
                ) : (
                  sortedSessions.map(s => (
                    <SessionItem
                      key={s.id}
                      s={s}
                      active={s.id === selectedSession}
                      onSelect={setSelectedSession}
                      onResume={handleResume}
                      onPin={handlePin}
                      onArchive={handleArchive}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            )}

            {/* MCP 状态 */}
            {!collapsed && (
              <div style={{ padding: '8px 12px', borderTop: '2px solid #225555' }}>
                <div style={{ fontSize: 10, color: '#51463B', opacity: 0.5, marginBottom: 4, fontWeight: 600, letterSpacing: 1 }}>
                  MCP 接入状态
                </div>
                {['claude', 'opencode', 'codex'].map(p => {
                  const info = mcpStatus[p];
                  const connected = info?.connected;
                  return (
                    <div key={p} style={{ fontSize: 11, color: connected ? '#225555' : '#51463B', opacity: connected ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
                        backgroundColor: connected ? '#225555' : '#CBC4AF',
                      }} />
                      {PLATFORM_INFO[p]?.label || p}
                      {connected && <span style={{ fontWeight: 600 }}>{info.active_sessions}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Sider>
        <Content style={{
          background: '#FAFAEE',
          padding: 24,
          overflow: 'auto',
        }}>
          <SessionContext.Provider value={selectedSession}>
            {children}
          </SessionContext.Provider>
        </Content>
      </Layout>
    </Layout>
  );
}
