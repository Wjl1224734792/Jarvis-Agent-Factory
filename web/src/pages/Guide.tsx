import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Card, List, Spin, Collapse, Alert, Input, Row, Col, Empty } from 'antd';
import {
  ReadOutlined, ThunderboltOutlined, CodeOutlined,
  RocketOutlined, SearchOutlined, PlayCircleOutlined,
  SafetyOutlined, ToolOutlined, ExperimentOutlined,
  BugOutlined, SyncOutlined, DeploymentUnitOutlined,
  QuestionCircleOutlined, BulbOutlined, AimOutlined,
  DashboardOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { api, CommandsData, CommandItem } from '../api';

const { Title, Text, Paragraph } = Typography;

const PIPELINE_GRID: { key: string; name: string; color: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'full', name: '全流程', color: '#52c41a', desc: '需求→任务→计划→实现→质量→测试→评审→发布', icon: <RocketOutlined /> },
  { key: 'frontend', name: '前端', color: '#ff4d4f', desc: '专注前端开发，含视觉验证', icon: <CodeOutlined /> },
  { key: 'backend', name: '后端', color: '#1677ff', desc: '专注后端开发，跳过视觉验证', icon: <CodeOutlined /> },
  { key: 'lite', name: '轻量', color: '#faad14', desc: '快速开发，支持Gate入口跳转', icon: <ThunderboltOutlined /> },
  { key: 'refactor', name: '重构', color: '#722ed1', desc: '边界→基线→重构→漂移检测→报告', icon: <ToolOutlined /> },
  { key: 'hotfix', name: '热修复', color: '#cf1322', desc: '声明→修复→验证→审计', icon: <BugOutlined /> },
  { key: 'debug', name: '调试', color: '#d46b08', desc: '收集→复现→调试→诊断→报告', icon: <BugOutlined /> },
  { key: 'research', name: '研究', color: '#2f54eb', desc: '课题→收集→分析→验证→报告', icon: <ExperimentOutlined /> },
  { key: 'release', name: '发布', color: '#237804', desc: '检测→质量门→版本→发布→验证', icon: <DeploymentUnitOutlined /> },
  { key: 'ask', name: '探询', color: '#eb2f96', desc: 'Interview/Direct/Consensus/Review', icon: <QuestionCircleOutlined /> },
  { key: 'simplify', name: '简化', color: '#13c2c2', desc: '分析→简化→回归→报告', icon: <SyncOutlined /> },
  { key: 'trace', name: '追踪', color: '#fa8c16', desc: '框架→假设→证据→分析→方案', icon: <AimOutlined /> },
  { key: 'improve', name: '改进', color: '#a0d911', desc: '目标→研究→计划→执行→评估', icon: <BulbOutlined /> },
  { key: 'migrate', name: '迁移', color: '#531dab', desc: '规则→迁移→编译→Lint', icon: <SyncOutlined /> },
  { key: 'evaluate', name: '评估', color: '#006d75', desc: '标准→原型→指标→报告', icon: <DashboardOutlined /> },
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

  const groupedCommands = useMemo(() => {
    const cmds = [...(commandsData?.project?.commands || []), ...(commandsData?.global?.commands || [])];
    const filtered = search
      ? cmds.filter(c => c.name.includes(search) || c.description.includes(search))
      : cmds;
    return filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
      const cat = cmd.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(cmd);
      return acc;
    }, {});
  }, [commandsData, search]);

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '0 4px' }}>
      {/* ── 标题 ── */}
      <Title level={4} style={{ marginTop: 0 }}>
        <ReadOutlined style={{ marginRight: 8 }} />使用指南
      </Title>

      {/* ── 快速开始 ── */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <PlayCircleOutlined style={{ marginRight: 6 }} />快速开始
        </Title>
        <Row gutter={[12, 8]}>
          <Col xs={24} sm={12}>
            <div style={{
              background: 'var(--ant-color-primary-bg)',
              borderRadius: 8, padding: '12px 16px', height: '100%',
            }}>
              <Text strong style={{ fontSize: 13 }}>不确定用什么？</Text>
              <code style={{
                display: 'block', marginTop: 6, padding: '6px 10px',
                background: 'var(--ant-color-bg-container)', borderRadius: 4, fontSize: 13,
              }}>/auto 我要做的任务...</code>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                自动检测任务类型，路由到最优流水线，跳过无关 Gate
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div style={{
              background: 'var(--ant-color-fill-secondary)',
              borderRadius: 8, padding: '12px 16px', height: '100%',
            }}>
              <Text strong style={{ fontSize: 13 }}>完整流程？</Text>
              <code style={{
                display: 'block', marginTop: 6, padding: '6px 10px',
                background: 'var(--ant-color-bg-container)', borderRadius: 4, fontSize: 13,
              }}>/jarvis 我要做一个完整的功能...</code>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                全流程 13 Gate 严格把关，适合中大型功能开发
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* ── 流水线类型 ── */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <ThunderboltOutlined style={{ marginRight: 6 }} />流水线类型（15种）
        </Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
          {PIPELINE_GRID.map(p => (
            <div
              key={p.key}
              style={{
                padding: '8px 10px', borderRadius: 8,
                background: 'var(--ant-color-bg-container)',
                border: `1px solid ${p.color}22`,
                borderLeft: `3px solid ${p.color}`,
                fontSize: 12,
              }}
            >
              <Text strong style={{ color: p.color, marginRight: 4 }}>{p.icon}</Text>
              <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>
                {p.desc}
              </Text>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 指令参考 ── */}
      <Card size="small">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Title level={5} style={{ margin: 0 }}>
            <CodeOutlined style={{ marginRight: 6 }} />指令参考
            {!commandsLoading && !commandsError && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 4, fontWeight: 400 }}>
                ({[...(commandsData?.project?.commands || []), ...(commandsData?.global?.commands || [])].length} 条)
              </Text>
            )}
          </Title>
          <Input
            size="small"
            placeholder="搜索指令..."
            prefix={<SearchOutlined />}
            style={{ width: 180 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
          />
        </div>
        {commandsLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
        ) : commandsError ? (
          <Alert message="指令加载失败，请确保引擎已启动" type="warning" showIcon style={{ fontSize: 13 }} />
        ) : Object.keys(groupedCommands).length === 0 ? (
          <Empty description="暂无命令数据" style={{ marginTop: 60 }} />
        ) : (
          <Collapse
            size="small"
            ghost
            items={Object.entries(groupedCommands).map(([cat, cmds]) => ({
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
                    <List.Item style={{ padding: '6px 0', border: 'none' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text code style={{ fontSize: 12, whiteSpace: 'nowrap' }}>/{cmd.name}</Text>
                        <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: cmd.description }}>
                          {cmd.description || '暂无描述'}
                        </Text>
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
