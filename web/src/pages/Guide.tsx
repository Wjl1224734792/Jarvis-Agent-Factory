import React, { useState, useEffect } from 'react';
import { Typography, Card, Tag, List, Spin, Collapse, Alert } from 'antd';
import {
  ReadOutlined, ThunderboltOutlined, CodeOutlined,
  RocketOutlined, BookOutlined, LinkOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { api, CommandsData, CommandItem } from '../api';

const { Title, Text, Paragraph, Link } = Typography;

const PIPELINE_INFO: Record<string, { name: string; color: string; desc: string }> = {
  full: { name: '全流程', color: '#52c41a', desc: '1→2→3→...→N 顺序执行所有 Gate' },
  frontend: { name: '前端', color: '#ff4d4f', desc: '专注前端开发，跳过部署 Gate' },
  backend: { name: '后端', color: '#1677ff', desc: '专注后端开发，包含部署 Gate' },
  lite: { name: '轻量', color: '#faad14', desc: '快速开发，跳过审查/安全 Gate' },
  refactor: { name: '重构', color: '#722ed1', desc: '重构流程，强调测试和审查' },
  hotfix: { name: '紧急热修复', color: '#cf1322', desc: '极速修复，最小化审批链路' },
  migrate: { name: '框架迁移', color: '#531dab', desc: '框架/依赖迁移，强化测试' },
  evaluate: { name: '技术评估', color: '#006d75', desc: '只生成评估报告，不执行代码变更' },
  debug: { name: '调试诊断', color: '#d46b08', desc: '诊断模式，只分析不修改' },
};

const CORE_RULES = [
  '所有 Agent 启动时必须读取 AGENTS.md',
  'Session 隔离：每个会话独立流水线状态',
  'Gate 硬约束：操作前必须通过 gate_check',
  '文档驱动：所有产物遵循 AGENTS.md § L7 规范',
];

export default function Guide() {
  const [commandsData, setCommandsData] = useState<CommandsData | null>(null);
  const [commandsLoading, setCommandsLoading] = useState(true);
  const [commandsError, setCommandsError] = useState(false);

  useEffect(() => {
    api.commands()
      .then(setCommandsData)
      .catch(() => setCommandsError(true))
      .finally(() => setCommandsLoading(false));
  }, []);

  // 按分类分组指令
  const groupedCommands = (commandsData?.project?.commands || []).reduce<Record<string, CommandItem[]>>(
    (acc, cmd) => {
      const cat = cmd.category || '其他';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(cmd);
      return acc;
    },
    {},
  );

  const categoryLabels: Record<string, string> = {
    workflow: '工作流',
    pipeline: '流水线',
    session: '会话',
    agent: '智能体',
    wiki: '知识库',
    debug: '调试',
    release: '发布',
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '0 4px' }}>
      <Title level={4} style={{ marginTop: 0 }}>
        <ReadOutlined style={{ marginRight: 8 }} />使用指南
      </Title>

      {/* ===== 快速入门 ===== */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <RocketOutlined style={{ marginRight: 6 }} />快速开始
        </Title>
        <Paragraph style={{ marginBottom: 8 }}>
          在 Claude Code 会话中发送以下命令启动 Jarvis 流水线：
        </Paragraph>
        <code style={{
          display: 'block', background: 'var(--ant-color-fill-secondary)', padding: '8px 12px',
          borderRadius: 6, fontSize: 13, marginBottom: 8,
        }}>
          /jarvis 我要做一个任务...
        </code>
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
          引擎会自动初始化会话、按 Gate 序列引导你完成全流程。
        </Paragraph>
      </Card>

      {/* ===== 核心约束 ===== */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <CheckCircleOutlined style={{ marginRight: 6 }} />核心约束
        </Title>
        <List
          size="small"
          dataSource={CORE_RULES}
          renderItem={item => (
            <List.Item style={{ padding: '4px 0', border: 'none' }}>
              <Tag color="blue" style={{ borderRadius: 4 }}>红线</Tag>
              <Text style={{ fontSize: 13 }}>{item}</Text>
            </List.Item>
          )}
        />
        <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
          <Link href="https://github.com/Wjl1224734792/Jarvis-Agent-Factory/blob/main/AGENTS.md" target="_blank">
            <LinkOutlined /> 完整约束文档 AGENTS.md
          </Link>
        </Paragraph>
      </Card>

      {/* ===== 流水线类型 ===== */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <ThunderboltOutlined style={{ marginRight: 6 }} />流水线类型
        </Title>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(PIPELINE_INFO).map(([key, info]) => (
            <Tag
              key={key}
              color={info.color}
              style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12, margin: 0 }}
            >
              {info.name}
            </Tag>
          ))}
        </div>
        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          更多细节见 AGENTS.md § L3 流水线体系
        </Paragraph>
      </Card>

      {/* ===== 指令参考 ===== */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <CodeOutlined style={{ marginRight: 6 }} />指令参考 ({commandsData?.project?.commands?.length || 0} 条)
        </Title>
        {commandsLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
        ) : commandsError ? (
          <Alert message="指令加载失败，请确保引擎已启动" type="warning" showIcon style={{ fontSize: 13 }} />
        ) : (
          <Collapse
            size="small"
            ghost
            items={Object.entries(groupedCommands).map(([cat, cmds]) => ({
              key: cat,
              label: <Text strong style={{ fontSize: 13 }}>{categoryLabels[cat] || cat} ({cmds.length})</Text>,
              children: (
                <List
                  size="small"
                  dataSource={cmds}
                  renderItem={cmd => (
                    <List.Item style={{ padding: '6px 0', border: 'none' }}>
                      <div style={{ flex: 1 }}>
                        <Text code style={{ fontSize: 12, marginRight: 8 }}>/{cmd.name}</Text>
                        <Text style={{ fontSize: 12 }}>{cmd.description}</Text>
                      </div>
                      <Tag style={{ fontSize: 10, margin: 0 }}>
                        {PIPELINE_INFO[cmd.pipelineType]?.name || cmd.pipelineType}
                      </Tag>
                    </List.Item>
                  )}
                />
              ),
            }))}
          />
        )}
      </Card>

      {/* ===== 更多资源 ===== */}
      <Card size="small">
        <Title level={5} style={{ marginTop: 0 }}>
          <BookOutlined style={{ marginRight: 6 }} />更多资源
        </Title>
        <Paragraph style={{ marginBottom: 4 }}>
          <Link href="/wiki">
            <LinkOutlined /> 知识库 — 项目架构、设计决策、调试经验
          </Link>
        </Paragraph>
        <Paragraph style={{ marginBottom: 4 }}>
          <Link href="/commands">
            <LinkOutlined /> 指令详情 — 所有可用 slash 命令
          </Link>
        </Paragraph>
        <Paragraph style={{ marginBottom: 4 }}>
          <Link href="/agents">
            <LinkOutlined /> 智能体配置 — 71 个 Agent 模型与策略
          </Link>
        </Paragraph>
        <Paragraph style={{ marginBottom: 0 }}>
          <Link href="https://github.com/Wjl1224734792/Jarvis-Agent-Factory/releases" target="_blank">
            <LinkOutlined /> GitHub Release — 下载预构建包
          </Link>
        </Paragraph>
      </Card>
    </div>
  );
}
