import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Tag, Typography, Tabs, Alert, Skeleton, Empty,
} from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import { theme } from 'antd';
import type { CommandItem } from '../api';
import { api } from '../api';

const { Text, Paragraph } = Typography;

// ============================================================
// 静态 Fallback 数据 — API 不可用时的后备指令列表
// ============================================================

const FALLBACK_COMMANDS: CommandItem[] = [
  { name: 'algorithm-expert', description: '直接对话算法专家——算法选型、复杂度分析、数据结构设计与性能优化方案', argumentHint: '[你的算法问题]', pipelineType: 'full', category: 'architecture' },
  { name: 'android', description: 'Android 原生开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布', argumentHint: '[Android 需求描述]', pipelineType: 'full', category: 'platform' },
  { name: 'backend-architect', description: '直接对话后端架构师——微服务拆分、数据库架构、分布式可靠性与数据一致性方案', argumentHint: '[你的后端架构问题]', pipelineType: 'full', category: 'architecture' },
  { name: 'backend', description: '后端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布完整链路', argumentHint: '[后端需求描述]', pipelineType: 'backend', category: 'development' },
  { name: 'browser-test', description: '浏览器探索测试——browser-use 自主探索 + 自动发现 UI bug + 出报告', argumentHint: '[测试目标—URL 或功能描述]', pipelineType: 'full', category: 'testing' },
  { name: 'bug-fix', description: 'Bug 修复闭环——浏览器复现→定位根因→修复→浏览器验证', argumentHint: '[Bug 描述、URL 或复现步骤]', pipelineType: 'full', category: 'testing' },
  { name: 'explore', description: '浏览器自由探索——browser-use 自主探索 + 自动发现 UI bug + 出具结构化报告', argumentHint: '[URL 或功能描述]', pipelineType: 'full', category: 'testing' },
  { name: 'expo', description: 'Expo 跨端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布', argumentHint: '[Expo 需求描述]', pipelineType: 'full', category: 'platform' },
  { name: 'flutter', description: 'Flutter 跨端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布', argumentHint: '[Flutter 需求描述]', pipelineType: 'full', category: 'platform' },
  { name: 'frontend-architect', description: '直接对话前端架构师——技术选型、组件架构、状态管理、构建工具链与性能架构方案', argumentHint: '[你的前端架构问题]', pipelineType: 'full', category: 'architecture' },
  { name: 'frontend', description: '前端开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布完整链路', argumentHint: '[前端需求描述]', pipelineType: 'frontend', category: 'development' },
  { name: 'ios', description: 'iOS 原生开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布', argumentHint: '[iOS 需求描述]', pipelineType: 'full', category: 'platform' },
  { name: 'jarvis-lite', description: '贾维斯轻量编排——智能Gate映射，按任务类型跳过无关闸门', argumentHint: '[任务描述]', pipelineType: 'lite', category: 'development' },
  { name: 'publish', description: '一键发布——质量门检查→测试→版本bump→commit→push→tag→PR→merge→release', argumentHint: '[版本类型：patch|minor|major，默认patch]', pipelineType: 'publish', category: '流程' },
  { name: 'jarvis', description: '启动贾维斯全流程编排——需求→任务→计划→实现→质量→测试→评审→发布', argumentHint: '', pipelineType: 'full', category: 'development' },
  { name: 'review-fix', description: '进入审查修复优化闭环——初审→规划→执行→验证→复审完整链路', argumentHint: '[审查范围]', pipelineType: 'full', category: 'review' },
  { name: 'review', description: '进入只读审查模式——审查代码/项目/风险，不修改任何文件', argumentHint: '[审查对象]', pipelineType: 'full', category: 'review' },
  { name: 'taro', description: 'Taro 小程序/H5 开发生命周期——需求→任务→计划→实现→质量→测试→评审→发布', argumentHint: '[Taro 需求描述]', pipelineType: 'full', category: 'platform' },
  { name: 'task-bdd', description: 'BDD行为驱动——为高业务价值的聚合行为编写Gherkin场景', argumentHint: '', pipelineType: 'full', category: 'task' },
  { name: 'task-ddd', description: 'DDD领域驱动分析——从需求文档中提取聚合根、实体、值对象、领域服务、领域事件', argumentHint: '', pipelineType: 'full', category: 'task' },
  { name: 'task-tdd', description: 'TDD测试驱动任务——为BDD场景或纯技术需求生成测试骨架与任务包', argumentHint: '', pipelineType: 'full', category: 'task' },
  { name: 'test-unit', description: '单元测试生成与执行——自动检测测试框架，生成覆盖率门禁测试用例', argumentHint: '[测试范围或模块路径]', pipelineType: 'full', category: 'test' },
  { name: 'test-integration', description: '集成测试/API测试指令——基于OpenAPI契约生成集成测试', argumentHint: '[API端点或服务名称]', pipelineType: 'full', category: 'test' },
  { name: 'test-e2e', description: '端到端测试指令——基于用户故事生成Playwright/Cypress脚本', argumentHint: '[用户故事或E2E范围]', pipelineType: 'full', category: 'test' },
  { name: 'test-perf', description: '性能测试指令——k6/Artillery负载测试，对比基线，定位性能瓶颈', argumentHint: '[测试目标端点]', pipelineType: 'full', category: 'test' },
  { name: 'test-security', description: '安全测试(DAST)指令——OWASP ZAP动态扫描', argumentHint: '[测试目标URL]', pipelineType: 'full', category: 'test' },
  { name: 'refactor', description: '重构指令——R1→R2→R3→R4→R5，完整5Gate安全网', argumentHint: '[重构目标描述]', pipelineType: 'refactor', category: 'refactor' },
  { name: 'hotfix', description: '紧急热修复指令——H0→H1→H2→H3，4Gate紧急流程', argumentHint: '[故障描述]', pipelineType: 'hotfix', category: 'hotfix' },
  { name: 'migrate', description: '框架迁移指令——M1→M2→M3→M4，4Gate迁移流程', argumentHint: '[迁移描述如Express→Fastify]', pipelineType: 'migrate', category: 'migrate' },
  { name: 'evaluate', description: '技术评估指令——E0→E1→E2→E3，4Gate评估流程', argumentHint: '[评估对象]', pipelineType: 'evaluate', category: 'evaluate' },
  { name: 'sync', description: '同步项目文档——检查并更新核心文档使其与代码一致，清理过时文件', argumentHint: '[--dry-run 预览模式] [--no-clean 跳过清理]', pipelineType: 'sync', category: '工具' },
  { name: 'debug', description: '调试诊断指令——D0→D1→D2→D3→D4，5Gate诊断流程', argumentHint: '[异常描述]', pipelineType: 'debug', category: 'debug' },
];

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
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.commands()
      .then(data => {
        if (cancelled) return;
        if (data.commands && data.commands.length > 0) {
          setCommands(data.commands);
        } else {
          // 空响应也使用 fallback
          setCommands(FALLBACK_COMMANDS);
          setUsingFallback(true);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // API 不可用时使用静态 fallback
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setCommands(FALLBACK_COMMANDS);
        setUsingFallback(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  /** 按当前 Tab 筛选指令 */
  const filteredCommands = useMemo(
    () => activeTab === 'all'
      ? commands
      : commands.filter(c => c.category === activeTab),
    [commands, activeTab],
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
  // 渲染
  // ============================================================

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
            {filteredCommands.length} / {commands.length}
          </Tag>
          {usingFallback && (
            <Tag style={{
              marginLeft: 4,
              borderRadius: 12,
              backgroundColor: 'var(--ant-color-warning-bg)',
              color: 'var(--ant-color-warning)',
              border: 'none',
              fontSize: 11,
            }}>
              离线数据
            </Tag>
          )}
        </div>
      </div>

      {/* Fallback 提示 */}
      {usingFallback && (
        <Alert
          type="warning"
          message={error ? `API 错误: ${error}` : 'API 服务暂不可用，当前展示内置指令数据'}
          banner
          style={{ borderRadius: token.borderRadiusLG, marginBottom: 12, flexShrink: 0 }}
        />
      )}

      {/* 分类 Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        style={{ flexShrink: 0, marginBottom: 0 }}
        tabBarStyle={{ marginBottom: 0 }}
        items={CATEGORY_TABS.map(tab => ({
          key: tab.key,
          label: (
            <span style={{ fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400 }}>
              {tab.label}
            </span>
          ),
        }))}
      />

      {/* 指令卡片网格 */}
      <div style={{ flex: 1, overflow: 'auto', paddingTop: 8 }}>
        {filteredCommands.length === 0 ? (
          <Empty description="没有匹配的指令" style={{ marginTop: 40 }} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 10,
          }}>
            {filteredCommands.map(cmd => (
              <CommandCard key={cmd.name} cmd={cmd} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
