import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Card, List, Spin, Collapse, Alert, Input, Row, Col, Empty, Tag } from 'antd';
import {
  ReadOutlined, ThunderboltOutlined, CodeOutlined,
  RocketOutlined, SearchOutlined, PlayCircleOutlined,
  BugOutlined, SyncOutlined, DeploymentUnitOutlined,
  QuestionCircleOutlined, BulbOutlined, AimOutlined,
  DashboardOutlined, ToolOutlined, ExperimentOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { api, CommandsData, CommandItem } from '../api';

const { Title, Text, Paragraph } = Typography;

// ── 流水线类型分组 ──
const PIPELINE_GROUPS = [
  {
    title: '开发',
    items: [
      { key: 'full', name: '全流程', color: '#52c41a', desc: '需求→任务→计划→实现→质量→测试→评审→发布', icon: <RocketOutlined /> },
      { key: 'frontend', name: '前端', color: '#ff4d4f', desc: '专注前端开发，含视觉验证', icon: <CodeOutlined /> },
      { key: 'backend', name: '后端', color: '#1677ff', desc: '专注后端开发，跳过视觉验证', icon: <CodeOutlined /> },
      { key: 'lite', name: '轻量编排', color: '#faad14', desc: '智能跳过无关 Gate，适合日常小任务', icon: <ThunderboltOutlined /> },
    ],
  },
  {
    title: '诊断与修复',
    items: [
      { key: 'debug', name: '调试诊断', color: '#d46b08', desc: '收集信息→复现→调试→诊断→报告', icon: <BugOutlined /> },
      { key: 'hotfix', name: '紧急热修复', color: '#cf1322', desc: '紧急声明→最小化修复→快速验证→事后审计', icon: <BugOutlined /> },
      { key: 'refactor', name: '重构', color: '#722ed1', desc: '边界定义→基线测试→重构→漂移检测→报告', icon: <ToolOutlined /> },
    ],
  },
  {
    title: '发布与评估',
    items: [
      { key: 'release', name: '发布', color: '#237804', desc: '环境检测→质量门→版本递增→发布→验证', icon: <DeploymentUnitOutlined /> },
      { key: 'evaluate', name: '技术评估', color: '#006d75', desc: '定义标准→生成原型→收集指标→生成报告', icon: <DashboardOutlined /> },
      { key: 'migrate', name: '框架迁移', color: '#531dab', desc: '规则验证→应用迁移→编译验证→Lint 修复', icon: <SyncOutlined /> },
    ],
  },
  {
    title: '专项',
    items: [
      { key: 'research', name: '深度研究', color: '#2f54eb', desc: '课题定义→信息收集→深度分析→假设验证→报告', icon: <ExperimentOutlined /> },
      { key: 'ask', name: '需求探询', color: '#eb2f96', desc: '4 模式结构化需求澄清与交付', icon: <QuestionCircleOutlined /> },
      { key: 'simplify', name: '代码简化', color: '#13c2c2', desc: '分析→简化执行→回归验证→报告产出', icon: <SyncOutlined /> },
      { key: 'trace', name: '因果追踪', color: '#fa8c16', desc: '假设驱动的科学根因定位', icon: <AimOutlined /> },
      { key: 'improve', name: '自主改进', color: '#a0d911', desc: '目标定义→研究→计划→执行→评估迭代', icon: <BulbOutlined /> },
    ],
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  workflow: <RocketOutlined />,
  pipeline: <ThunderboltOutlined />,
  session: <SafetyOutlined />,
  test: <ExperimentOutlined />,
  debug: <BugOutlined />,
  release: <DeploymentUnitOutlined />,
  review: <SearchOutlined />,
  development: <CodeOutlined />,
  requirements: <QuestionCircleOutlined />,
  refactor: <ToolOutlined />,
  simplification: <SyncOutlined />,
  improvement: <BulbOutlined />,
  platform: <CodeOutlined />,
  trace: <AimOutlined />,
};

const categoryLabels: Record<string, string> = {
  workflow: '工作流', pipeline: '流水线', session: '会话/清理',
  test: '测试', debug: '调试', release: '发布', review: '审查',
  development: '开发', requirements: '需求', refactor: '重构',
  simplification: '简化', improvement: '改进', platform: '平台',
  trace: '追踪', agent: '智能体', wiki: '知识库',
};

export default function Guide() {
  const [commandsData, setCommandsData] = useState<CommandsData | null>(null);
  const [commandsLoading, setCommandsLoading] = useState(true);
  const [commandsError, setCommandsError] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.commands()
      .then(setCommandsData)
      .catch(() => setCommandsError(true))
      .finally(() => setCommandsLoading(false));
  }, []);

  const { allCommands, groupedCommands } = useMemo(() => {
    const cmds = [...(commandsData?.project?.commands || []), ...(commandsData?.global?.commands || [])];
    const filtered = search
      ? cmds.filter(c => c.name.includes(search) || c.description.includes(search))
      : cmds;
    const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
      const cat = cmd.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(cmd);
      return acc;
    }, {});
    return { allCommands: cmds, groupedCommands: grouped };
  }, [commandsData, search]);

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '0 4px' }}>
      {/* ── 标题 ── */}
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
          <ReadOutlined style={{ marginRight: 8 }} />Jarvis 使用指南
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          多智能体编排引擎——从需求到发布的全流程 AI 辅助开发
        </Text>
      </div>

      {/* ── 快速开始 ── */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <PlayCircleOutlined style={{ marginRight: 6 }} />快速开始
        </Title>
        <Row gutter={[12, 8]}>
          <Col xs={24} sm={12}>
            <div style={{
              background: 'var(--ant-color-primary-bg)',
              borderRadius: 8, padding: '14px 16px', height: '100%',
            }}>
              <Text strong style={{ fontSize: 13 }}>日常任务——推荐首选</Text>
              <div style={{
                marginTop: 6, padding: '8px 12px',
                background: 'var(--ant-color-bg-container)', borderRadius: 6,
              }}>
                <Text code style={{ fontSize: 13 }}>/auto 你的任务描述...</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                智能检测任务类型，自动路由最优流水线，跳过无关 Gate。适合日常所有任务。
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div style={{
              background: 'var(--ant-color-fill-secondary)',
              borderRadius: 8, padding: '14px 16px', height: '100%',
            }}>
              <Text strong style={{ fontSize: 13 }}>中大型功能——完整流程</Text>
              <div style={{
                marginTop: 6, padding: '8px 12px',
                background: 'var(--ant-color-bg-container)', borderRadius: 6,
              }}>
                <Text code style={{ fontSize: 13 }}>/jarvis 完整功能描述...</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                12 道 Gate 严格把关，需求→DDD→BDD→TDD→架构→规划→实现→质量→视觉→测试→评审→发布。
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* ── 流水线类型 ── */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <ThunderboltOutlined style={{ marginRight: 6 }} />流水线类型（15 种）
        </Title>
        {PIPELINE_GROUPS.map(group => (
          <div key={group.title} style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {group.title}
            </Text>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6, marginTop: 4,
            }}>
              {group.items.map(p => (
                <div
                  key={p.key}
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--ant-color-bg-container)',
                    border: `1px solid ${p.color}18`,
                    borderLeft: `3px solid ${p.color}`,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: p.color }}>{p.icon}</span>
                    <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
                    <Tag style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px', borderRadius: 4, color: p.color, background: `${p.color}15`, border: 'none' }}>
                      /{p.key}
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4, lineHeight: 1.3 }}>
                    {p.desc}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>

      {/* ── 工作流概览 ── */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <SafetyOutlined style={{ marginRight: 6 }} />Gate 质量门
        </Title>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          全流程 12 道 Gate，每道 Gate 有明确的准入条件和产出要求，确保质量可控。
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 4 }}>
          {[
            ['A', '需求澄清', '#1890ff'],
            ['B-DDD', '领域分析', '#722ed1'],
            ['B-BDD', '行为驱动', '#722ed1'],
            ['B-TDD', '任务拆解', '#722ed1'],
            ['B1', '架构评审', '#faad14'],
            ['C', '执行规划', '#52c41a'],
            ['C-impl', '批量实现', '#52c41a'],
            ['C1', '代码质量', '#13c2c2'],
            ['C1.5', '视觉验证', '#eb2f96'],
            ['C2', '测试验证', '#2f54eb'],
            ['D', '多领域评审', '#fa8c16'],
            ['E', '发布上线', '#cf1322'],
          ].map(([gate, label, color]) => (
            <div key={gate} style={{
              padding: '6px 10px', borderRadius: 6, fontSize: 12,
              background: 'var(--ant-color-bg-container)',
              border: `1px solid ${color}30`,
            }}>
              <Tag style={{ fontSize: 10, margin: 0, padding: '0 4px', borderRadius: 4, color, background: `${color}15`, border: 'none', fontWeight: 700 }}>
                {gate}
              </Tag>
              <Text style={{ fontSize: 11, marginLeft: 4, color: 'var(--ant-color-text)' }}>{label}</Text>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 指令参考 ── */}
      <Card size="small">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Title level={5} style={{ margin: 0 }}>
            <CodeOutlined style={{ marginRight: 6 }} />可用指令
            {!commandsLoading && !commandsError && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 4, fontWeight: 400 }}>
                ({allCommands.length} 条)
              </Text>
            )}
          </Title>
          <Input
            size="small"
            placeholder="搜索指令..."
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
          />
        </div>
        {commandsLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin size="small" /></div>
        ) : commandsError ? (
          <Alert message="指令加载失败，请确保引擎已启动" type="warning" showIcon style={{ fontSize: 13 }} />
        ) : Object.keys(groupedCommands).length === 0 ? (
          <Empty description={search ? '没有匹配的指令' : '暂无指令数据'} style={{ marginTop: 60 }} />
        ) : (
          <Collapse
            size="small"
            ghost
            items={Object.entries(groupedCommands)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cat, cmds]) => ({
                key: cat,
                label: (
                  <span>
                    {categoryIcons[cat] || <CodeOutlined />}
                    <Text strong style={{ fontSize: 13, marginLeft: 6 }}>
                      {categoryLabels[cat] || cat}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>({cmds.length})</Text>
                  </span>
                ),
                children: (
                  <List
                    size="small"
                    dataSource={cmds}
                    renderItem={(cmd: CommandItem) => (
                      <List.Item style={{ padding: '6px 0 6px 8px', border: 'none', borderLeft: '2px solid var(--ant-color-border-secondary)' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <Text code style={{ fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}>
                            /{cmd.name}
                          </Text>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 12 }}>{cmd.description || '暂无描述'}</Text>
                            {cmd.argumentHint && (
                              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                                用法: /{cmd.name} {cmd.argumentHint}
                              </Text>
                            )}
                          </div>
                          {cmd.pipelineType && (
                            <Tag style={{ fontSize: 10, margin: 0, flexShrink: 0, borderRadius: 4 }}>
                              {cmd.pipelineType}
                            </Tag>
                          )}
                        </div>
                      </List.Item>
                    )}
                  />
                ),
              }))}
          />
        )}
      </Card>
    </div>
  );
}
