import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Row, Col, Tag, Input, Button, Modal, Select,
  Spin, Empty, message,
} from 'antd';
import {
  SearchOutlined, RobotOutlined, SettingOutlined,
  CloseCircleOutlined, LoadingOutlined,
} from '@ant-design/icons';
import type { AgentItem, AgentsData } from '../api';
import { api } from '../api';
import { matchPipelineType } from './matchPipelineType';

const PLATFORM_INFO: Record<string, { label: string; color: string; bg: string }> = {
  claude: { label: 'Claude', color: 'var(--ant-color-success)', bg: 'var(--ant-color-success-bg)' },
  opencode: { label: 'OpenCode', color: 'var(--ant-color-error)', bg: 'var(--ant-color-error-bg)' },
  codex: { label: 'Codex', color: 'var(--ant-color-success)', bg: 'var(--ant-color-success-bg)' },
};


const EFFORT_LABELS: Record<string, string> = {
  low: '低', medium: '中', high: '高', xhigh: '很高', max: '最大',
};

/**
 * 功能分类匹配 — 根据 agent ID 判断功能角色
 * @param id - 智能体 ID
 * @param role - 功能分类值
 */
function matchFunctionRole(id: string, role: string): boolean {
  const idLower = id.toLowerCase();
  const idIncludes = (seg: string) => idLower.includes(seg);
  const idStartsWith = (prefix: string) => idLower.startsWith(prefix);

  switch (role) {
    case '编排者':
      return ['jarvis', 'frontend', 'backend', 'android', 'ios',
        'flutter', 'expo', 'taro', 'jarvis-lite'].includes(idLower);
    case '实现者':
      return idIncludes('-dev-') || idIncludes('-ui-') || idIncludes('-state-') ||
        idIncludes('-api-') || idIncludes('-data-') || idIncludes('-logic-');
    case '审查者':
      return (
        idIncludes('-review-') ||
        ['review', 'qa-review', 'security-review', 'perf-review',
          'diff-review', 'project-review', 'change-review'].some(n => idLower === n || idStartsWith(n))
      );
    case '测试者':
      return (
        idIncludes('-test-') ||
        ['test', 'browser-test', 'e2e-test', 'api-test', 'perf-test',
          'test-doc', 'test-executor'].some(n => idLower === n || idStartsWith(n))
      );
    case '架构师':
      return idIncludes('architect') || idLower === 'algorithm-expert';
    case '浏览器':
      return idLower.includes('browser-use');
    case '支撑':
      return idLower === 'external-resource-expert' || idLower === 'skill-assignment-expert';
    case '专家':
      return idIncludes('expert');
    default:
      return true;
  }
}

function PixelAvatar({ icon, size = 48 }: { icon: string; size?: number }) {
  const grid = icon || '0000000000000000000000000000000000000000000000000000000000000000';
  const cellSize = size / 8;
  const cells: { x: number; y: number; c: string }[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const ch = grid[row * 8 + col] || '0';
      if (ch !== '0') {
        cells.push({ x: col, y: row, c: ch === '1' ? 'var(--ant-color-success)' : ch === '2' ? 'var(--ant-color-success)' : ch === '3' ? 'var(--ant-color-error)' : 'var(--ant-color-text)' });
      }
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: 4, flexShrink: 0 }}>
      <rect width={size} height={size} fill="var(--ant-color-bg-container)" rx={4} />
      {cells.map((c, i) => (
        <rect key={i} x={c.x * cellSize} y={c.y * cellSize} width={cellSize} height={cellSize} fill={c.c} />
      ))}
    </svg>
  );
}

export default function Agents() {
  const [data, setData] = useState<AgentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('all');
  const [category, setCategory] = useState('全部');
  const [pipelineType, setPipelineType] = useState('all');
  const [functionRole, setFunctionRole] = useState('all');
  const [search, setSearch] = useState('');
  const [editAgent, setEditAgent] = useState<AgentItem | null>(null);
  const [editModel, setEditModel] = useState('');
  const [editEffort, setEditEffort] = useState('high');
  const [saving, setSaving] = useState(false);

  const loadAgents = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const d = await api.agents(params);
      setData(d);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (platform !== 'all') params.platform = platform;
    if (category !== '全部') params.category = category;
    if (search) params.search = search;
    loadAgents(params);
  }, [platform, category, search, loadAgents]);

  const openEdit = (agent: AgentItem) => {
    setEditAgent(agent);
    setEditModel(agent.model || agent.defaultModel);
    setEditEffort(agent.effort || agent.defaultEffort || 'high');
  };

  const handleSave = async () => {
    if (!editAgent) return;
    setSaving(true);
    try {
      // api.fetchJSON 成功时返回 JSON 对象，失败时抛出异常
      // 因此无需检查 .ok 属性（JSON 对象不存在 .ok）
      const r = await api.saveAgent(editAgent.id, editModel, editEffort);
      message.success(r.file_synced ? '已保存并同步文件' : '已保存');
      setEditAgent(null);
      loadAgents({ platform: platform !== 'all' ? platform : undefined } as Record<string, string>);
    } catch {
      message.error('保存失败，请检查引擎是否在线');
    } finally {
      setSaving(false);
    }
  };

  const allAgents = data?.agents || [];
  const isTemplate = editAgent?.source === 'template';

  // 客户端三级筛选：平台（服务端）→ 流程分类 → 功能分类
  const filteredByPipeline = useMemo(
    () => pipelineType === 'all'
      ? allAgents
      : allAgents.filter(a => matchPipelineType(a.id, pipelineType)),
    [pipelineType, allAgents]
  );

  const agents = useMemo(
    () => functionRole === 'all'
      ? filteredByPipeline
      : filteredByPipeline.filter(a => matchFunctionRole(a.id, functionRole)),
    [functionRole, filteredByPipeline]
  );

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ant-color-text)' }}>
            <RobotOutlined style={{ marginRight: 6 }} />智能体配置
          </span>
          {data && (
            <Tag style={{ marginLeft: 8, borderRadius: 12, backgroundColor: 'var(--ant-color-primary-bg)', color: 'var(--ant-color-primary)', border: 'none' }}>
              {agents.length} / {data.total_count}
            </Tag>
          )}
          {data && (
            <span style={{ fontSize: 12, color: 'var(--ant-color-text)', opacity: 0.5, marginLeft: 8 }}>
              {PLATFORM_INFO[platform]?.label || '全部平台'} · {category} · {agents.length} 个
            </span>
          )}
        </div>
      </div>

      {/* 筛选栏 */}
      <Card size="small" style={{ borderRadius: 18, marginBottom: 12 }}>
        <Row gutter={[8, 8]} align="middle">
          <Col>
            <span style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.5, fontWeight: 600, marginRight: 4 }}>
              平台:
            </span>
          </Col>
          <Col>
            {['all', 'claude', 'opencode', 'codex'].map(p => (
              <Button
                key={p}
                size="small"
                type={platform === p ? 'primary' : 'default'}
                onClick={() => setPlatform(p)}
                style={{ borderRadius: 12, fontWeight: 600, fontSize: 10, marginRight: 4 }}
              >
                {p === 'all' ? '全部' : PLATFORM_INFO[p]?.label || p}
              </Button>
            ))}
          </Col>
        </Row>
        <Row gutter={[8, 8]} align="middle" style={{ marginTop: 8 }}>
          <Col>
            <span style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.5, fontWeight: 600, marginRight: 4 }}>
              分类:
            </span>
          </Col>
          <Col>
            {['全部', ...(data?.categories || []).filter(c => c !== '全部' && c !== '模板默认')].map(c => (
              <Button
                key={c}
                size="small"
                type={category === c ? 'primary' : 'default'}
                onClick={() => setCategory(c)}
                style={{ borderRadius: 12, fontWeight: 600, fontSize: 10, marginRight: 4 }}
              >
                {c}
              </Button>
            ))}
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Input
              size="small"
              placeholder="搜索名称/ID/角色..."
              prefix={<SearchOutlined style={{ color: 'var(--ant-color-text)' }} />}
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 200, borderRadius: 12 }}
            />
          </Col>
        </Row>
        <Row gutter={[8, 8]} align="middle" style={{ marginTop: 8 }}>
          <Col>
            <span style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.5, fontWeight: 600, marginRight: 4 }}>
              流程:
            </span>
          </Col>
          <Col>
            {['all', '全流程', '前端', '后端', '移动端', '轻量', '架构', '测试', '审查'].map(t => (
              <Button
                key={t}
                size="small"
                type={pipelineType === t ? 'primary' : 'default'}
                onClick={() => setPipelineType(t)}
                style={{ borderRadius: 12, fontWeight: 600, fontSize: 10, marginRight: 4 }}
              >
                {t === 'all' ? '全部' : t}
              </Button>
            ))}
          </Col>
        </Row>
        <Row gutter={[8, 8]} align="middle" style={{ marginTop: 8 }}>
          <Col>
            <span style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.5, fontWeight: 600, marginRight: 4 }}>
              功能:
            </span>
          </Col>
          <Col>
            {['all', '编排者', '实现者', '审查者', '测试者', '架构师', '浏览器', '支撑', '专家'].map(r => (
              <Button
                key={r}
                size="small"
                type={functionRole === r ? 'primary' : 'default'}
                onClick={() => setFunctionRole(r)}
                style={{ borderRadius: 12, fontWeight: 600, fontSize: 10, marginRight: 4 }}
              >
                {r === 'all' ? '全部' : r}
              </Button>
            ))}
          </Col>
        </Row>
      </Card>

      {/* 卡片网格 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin indicator={<LoadingOutlined style={{ color: 'var(--ant-color-primary)' }} />} />
        </div>
      ) : agents.length === 0 ? (
        <Empty description="没有匹配的智能体" />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 10,
        }}>
          {agents.map(agent => (
            <Card
              key={agent.id}
              size="small"
              hoverable
              onClick={() => openEdit(agent)}
              style={{
                borderRadius: 18,
                border: agent.is_custom ? '2px solid var(--ant-color-border-secondary)' : '1px solid var(--ant-color-border-secondary)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <PixelAvatar icon={agent.icon} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ant-color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {agent.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.5 }}>
                    {agent.role}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                <Tag style={{ fontSize: 9, borderRadius: 8, backgroundColor: PLATFORM_INFO[agent.platform]?.bg || 'var(--ant-color-primary-bg)', color: PLATFORM_INFO[agent.platform]?.color || 'var(--ant-color-primary)', border: 'none' }}>
                  {PLATFORM_INFO[agent.platform]?.label || agent.platform}
                </Tag>
                <Tag style={{ fontSize: 9, borderRadius: 8, backgroundColor: 'var(--ant-color-bg-container)', color: 'var(--ant-color-text)', border: '1px solid var(--ant-color-success)' }}>
                  {agent.category || agent.source || '模板默认'}
                </Tag>
              </div>
              <div style={{ fontSize: 10, color: 'var(--ant-color-text)', opacity: 0.5, marginTop: 4 }}>
                {agent.model || agent.defaultModel} · {EFFORT_LABELS[agent.effort || agent.defaultEffort] || agent.effort}
              </div>
              {agent.is_custom && (
                <Tag style={{ marginTop: 4, borderRadius: 8, fontSize: 9, backgroundColor: 'var(--ant-color-fill)', color: 'var(--ant-color-text)', border: 'none' }}>
                  已配置
                </Tag>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      <Modal
        title={
          <span style={{ fontWeight: 600, color: 'var(--ant-color-text)' }}>
            <SettingOutlined style={{ marginRight: 6 }} />
            {editAgent?.name || '配置智能体'}
          </span>
        }
        open={!!editAgent}
        onCancel={() => setEditAgent(null)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        okButtonProps={{
          disabled: isTemplate,
          style: { borderRadius: 18 },
        }}
        cancelButtonProps={{ style: { borderRadius: 18 } }}
        width={400}
      >
        {editAgent && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <PixelAvatar icon={editAgent.icon} size={48} />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--ant-color-text)' }}>{editAgent.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ant-color-text)', opacity: 0.5 }}>{editAgent.role}</div>
                <Tag style={{ borderRadius: 8, fontSize: 9, marginTop: 2 }}>
                  {editAgent.category || editAgent.source || '模板默认'}
                </Tag>
              </div>
            </div>

            {/* 文件来源路径 */}
            {editAgent.fileName && (
              <div style={{
                padding: '6px 12px', borderRadius: 8, marginBottom: 12,
                backgroundColor: 'var(--ant-color-fill-quaternary)', fontSize: 11,
                color: 'var(--ant-color-text)', opacity: 0.65,
                fontFamily: 'Consolas, Monaco, monospace',
                wordBreak: 'break-all',
              }}>
                {editAgent.source === 'project'
                  ? `.claude/agents/${editAgent.fileName}`
                  : editAgent.source === 'global'
                    ? `~/.claude/agents/${editAgent.fileName}`
                    : `src/templates/platforms/${editAgent.platform}/agents/${editAgent.fileName}`}
              </div>
            )}

            {isTemplate && (
              <div style={{
                padding: '8px 12px', borderRadius: 12, marginBottom: 12,
                backgroundColor: 'var(--ant-color-fill)', color: 'var(--ant-color-text)', fontSize: 12,
                border: '1px solid var(--ant-color-border-secondary)',
              }}>
                模板默认智能体不可编辑
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ant-color-text)', marginBottom: 4 }}>模型</div>
              <Select
                value={editModel}
                onChange={setEditModel}
                disabled={isTemplate}
                style={{ width: '100%', borderRadius: 12 }}
                options={(data?.available_models || []).map(m => ({ label: m, value: m }))}
              />
              {editAgent.defaultModel !== editModel && (
                <div style={{ fontSize: 10, color: 'var(--ant-color-text)', marginTop: 2 }}>
                  默认: {editAgent.defaultModel}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ant-color-text)', marginBottom: 4 }}>思考等级</div>
              <Select
                value={editEffort}
                onChange={setEditEffort}
                disabled={isTemplate}
                style={{ width: '100%', borderRadius: 12 }}
                options={(data?.available_efforts || []).map(e => ({ label: `${EFFORT_LABELS[e] || e} (${e})`, value: e }))}
              />
              {editAgent.defaultEffort !== editEffort && (
                <div style={{ fontSize: 10, color: 'var(--ant-color-text)', marginTop: 2 }}>
                  默认: {EFFORT_LABELS[editAgent.defaultEffort] || editAgent.defaultEffort}
                </div>
              )}
            </div>

            {editAgent.is_custom && (
              <Button
                size="small"
                onClick={() => {
                  setEditModel(editAgent.defaultModel);
                  setEditEffort(editAgent.defaultEffort || 'high');
                }}
                style={{ borderRadius: 12, color: 'var(--ant-color-error)' }}
              >
                恢复默认
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
