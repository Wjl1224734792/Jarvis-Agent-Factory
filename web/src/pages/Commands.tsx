import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Tag, Typography, Tabs, Skeleton, Empty, Result, Button,
} from 'antd';
import { CodeOutlined, ReloadOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import type { CommandItem, CommandsData } from '../api';
import { api } from '../api';
import { filterCommands, onSourceTabChange } from '../utils/commands-filter';

const { Text, Paragraph } = Typography;

// ============================================================
// 常量
// ============================================================

/** Pipeline 类型标签配置 */
const PIPELINE_TAGS: Record<string, { label: string; color: string; bg: string }> = {
  full: { label: 'jarvis', color: 'var(--ant-color-success)', bg: 'var(--ant-color-success-bg)' },
  frontend: { label: 'frontend', color: 'var(--ant-color-error)', bg: 'var(--ant-color-error-bg)' },
  backend: { label: 'backend', color: 'var(--ant-color-info)', bg: 'var(--ant-color-info-bg)' },
  lite: { label: 'jarvis-lite', color: 'var(--ant-color-warning)', bg: 'var(--ant-color-warning-bg)' },
  refactor: { label: 'refactor', color: '#722ed1', bg: '#f9f0ff' },
  hotfix: { label: 'hotfix', color: '#cf1322', bg: '#fff2f0' },
  migrate: { label: 'migrate', color: '#531dab', bg: '#f9f0ff' },
  evaluate: { label: 'evaluate', color: '#006d75', bg: '#e6fffb' },
  debug: { label: 'debug', color: '#d46b08', bg: '#fff7e6' },
  publish: { label: 'publish', color: '#13c2c2', bg: '#e6fffb' },
  sync: { label: 'sync', color: '#2f54eb', bg: '#f0f5ff' },
};

/** 分类 Tab 配置 */
const CATEGORY_TABS = [
  { key: 'all', label: '全部' },
  { key: 'development', label: '开发' },
  { key: 'testing', label: '测试' },
  { key: 'review', label: '审查' },
  { key: 'architecture', label: '架构' },
  { key: 'task', label: '任务' },
  { key: 'platform', label: '平台' },
  { key: 'test', label: '测试指令' },
  { key: 'refactor', label: '重构' },
  { key: 'hotfix', label: '热修复' },
  { key: 'migrate', label: '迁移' },
  { key: 'evaluate', label: '评估' },
  { key: 'debug', label: '调试' },
  { key: '流程', label: '流程' },
  { key: '工具', label: '工具' },
];

/** 分类中文映射 */
const CATEGORY_LABELS: Record<string, string> = {
  development: '开发',
  testing: '测试',
  review: '审查',
  architecture: '架构',
  task: '任务',
  platform: '平台',
  test: '测试指令',
  refactor: '重构',
  hotfix: '热修复',
  migrate: '迁移',
  evaluate: '评估',
  debug: '调试',
  '流程': '流程',
  '工具': '工具',
};

// ============================================================
// 子组件
// ============================================================

interface CommandCardProps {
  cmd: CommandItem;
}

const CommandCard = React.memo(function CommandCard({ cmd }: CommandCardProps) {
  const pt = PIPELINE_TAGS[cmd.pipelineType] || PIPELINE_TAGS.full;
  const catLabel = CATEGORY_LABELS[cmd.category] || cmd.category;

  return (
    <Card
      size="small"
      hoverable
      style={{ borderRadius: 14, height: '100%' }}
    >
      {/* 指令名 — Mono 字体 */}
      <Text
        code
        style={{
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
        }}
      >
        /{cmd.name}
      </Text>

      {/* 描述 */}
      <Paragraph
        style={{
          marginTop: 8,
          marginBottom: 8,
          fontSize: 12,
          color: 'var(--ant-color-text)',
          lineHeight: 1.5,
        }}
        ellipsis={{ rows: 2 }}
      >
        {cmd.description || '暂无描述'}
      </Paragraph>

      {/* Argument Hint */}
      {cmd.argumentHint && (
        <Text
          style={{
            display: 'block',
            fontSize: 11,
            color: 'var(--ant-color-text)',
            opacity: 0.45,
            marginBottom: 8,
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
          }}
        >
          {cmd.argumentHint}
        </Text>
      )}

      {/* 标签行 */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
        <Tag
          style={{
            fontSize: 9,
            borderRadius: 8,
            backgroundColor: pt.bg,
            color: pt.color,
            border: 'none',
            margin: 0,
          }}
        >
          {pt.label}
        </Tag>
        <Tag
          style={{
            fontSize: 9,
            borderRadius: 8,
            backgroundColor: 'var(--ant-color-bg-container)',
            color: 'var(--ant-color-text)',
            border: '1px solid var(--ant-color-border-secondary)',
            margin: 0,
          }}
        >
          {catLabel}
        </Tag>
      </div>
    </Card>
  );
});

// ============================================================
// 页面组件
// ============================================================

export default function Commands() {
  const { token } = theme.useToken();
  const [data, setData] = useState<CommandsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceTab, setSourceTab] = useState<'project' | 'global'>('project');
  const [categoryTab, setCategoryTab] = useState('all');

  const fetchData = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    setError(null);

    api.commands()
      .then(d => {
        if (cancelled) return;
        setData(d);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const cancel = fetchData();
    return () => { cancel(); };
  }, [fetchData]);

  /** 来源 Tab 切换：重置分类筛选 */
  const handleSourceTabChange = useCallback((key: string) => {
    const next = onSourceTabChange(key as 'project' | 'global');
    setSourceTab(next.sourceTab);
    setCategoryTab(next.categoryTab);
  }, []);

  /** 各来源 Tab 的过滤后指令（hooks 必须在所有 early return 之前） */
  const projectFiltered = useMemo(
    () => filterCommands(data?.project?.commands ?? [], data?.global?.commands ?? [], 'project', categoryTab),
    [data, categoryTab],
  );
  const globalFiltered = useMemo(
    () => filterCommands(data?.project?.commands ?? [], data?.global?.commands ?? [], 'global', categoryTab),
    [data, categoryTab],
  );

  // ============================================================
  // 加载状态
  // ============================================================

  if (loading) {
    return (
      <div style={{ padding: '0 4px' }}>
        <div style={{ marginBottom: 16 }}>
          <Skeleton.Input active size="small" style={{ width: 200, marginBottom: 8 }} />
          <Skeleton.Input active size="small" style={{ width: 120 }} />
        </div>
        <Skeleton active paragraph={{ rows: 1 }} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 10,
          marginTop: 16,
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} size="small" style={{ borderRadius: 14 }}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  // 错误状态
  // ============================================================

  if (error && !data) {
    return (
      <div style={{ padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ant-color-text)' }}>
            <CodeOutlined style={{ marginRight: 6 }} />指令列表
          </span>
        </div>
        <Result
          status="error"
          title="加载失败"
          subTitle={error}
          extra={
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  // ============================================================
  // 渲染
  // ============================================================

  const projectName = data?.project.name ?? '项目';
  const projectCount = data?.project.commands.length ?? 0;
  const globalCount = data?.global.commands.length ?? 0;

  /**
   * 构建来源 Tab 内的内容：分类 Tabs + 指令卡片网格
   * @param src - 来源类型
   * @param cmds - 该来源下的指令列表
   * @param emptyHint - 空状态提示文本
   */
  const buildSourceContent = (cmds: CommandItem[], emptyHint: string) => (
    <>
      <Tabs
        activeKey={categoryTab}
        onChange={setCategoryTab}
        size="small"
        style={{ flexShrink: 0, marginBottom: 0 }}
        tabBarStyle={{ marginBottom: 0 }}
        items={CATEGORY_TABS.map(tab => ({
          key: tab.key,
          label: (
            <span style={{ fontSize: 13, fontWeight: categoryTab === tab.key ? 600 : 400 }}>
              {tab.label}
            </span>
          ),
        }))}
      />
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 8 }}>
        {cmds.length === 0 ? (
          <Empty description={emptyHint} style={{ marginTop: 40 }} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 10,
          }}>
            {cmds.map(cmd => (
              <CommandCard key={cmd.name} cmd={cmd} />
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ant-color-text)' }}>
            <CodeOutlined style={{ marginRight: 6 }} />指令列表
          </span>
          <Tag style={{
            marginLeft: 8,
            borderRadius: token.borderRadius,
            backgroundColor: token.colorPrimaryBg,
            color: token.colorPrimary,
            border: 'none',
          }}>
            {sourceTab === 'project' ? projectFiltered.length : globalFiltered.length} / {sourceTab === 'project' ? projectCount : globalCount}
          </Tag>
        </div>
      </div>

      {/* 第一层：来源 Tab */}
      <Tabs
        activeKey={sourceTab}
        onChange={handleSourceTabChange}
        size="small"
        style={{ flexShrink: 0, marginBottom: 0 }}
        tabBarStyle={{ marginBottom: 0 }}
        items={[
          {
            key: 'project',
            label: (
              <span style={{ fontSize: 13, fontWeight: sourceTab === 'project' ? 600 : 400 }}>
                {projectName}
                {projectCount > 0 && (
                  <Tag style={{
                    marginLeft: 4,
                    fontSize: 10,
                    borderRadius: 8,
                    backgroundColor: token.colorPrimaryBg,
                    color: token.colorPrimary,
                    border: 'none',
                  }}>
                    {projectCount}
                  </Tag>
                )}
              </span>
            ),
            children: buildSourceContent(
              projectFiltered,
              '当前项目无自定义指令，运行 `jarvis add claude` 安装',
            ),
          },
          {
            key: 'global',
            label: (
              <span style={{ fontSize: 13, fontWeight: sourceTab === 'global' ? 600 : 400 }}>
                全局
                {globalCount > 0 && (
                  <Tag style={{
                    marginLeft: 4,
                    fontSize: 10,
                    borderRadius: 8,
                    backgroundColor: token.colorPrimaryBg,
                    color: token.colorPrimary,
                    border: 'none',
                  }}>
                    {globalCount}
                  </Tag>
                )}
              </span>
            ),
            children: buildSourceContent(
              globalFiltered,
              '暂无全局指令',
            ),
          },
        ]}
      />
    </div>
  );
}
