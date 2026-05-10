import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Row, Col, Progress, Table, Empty, Spin, Statistic } from 'antd';
import type { AgentUsageResponse, AgentUsageEntry } from '../api';

interface TokenDashboardProps {
  runId: string | null;
  agentUsage: AgentUsageResponse | null;
  loading: boolean;
}

/** 数字滚动动画 hook：ease-out 缓动，从上次值过渡到新值 */
function useAnimatedNumber(target: number, duration = 800) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const startValue = prevRef.current;
    const startTime = performance.now();
    let rafId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out: 1 - (1-t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValue + (target - startValue) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    prevRef.current = target;
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return display;
}

/** Anthropic 模型价格表（USD / 1M tokens） */
const ANTHROPIC_PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7': { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5': { input: 1.00, output: 5.00 },
};

/** 计算单个 agent 的 USD 成本，非 Anthropic 模型返回 null */
function estimateCost(entry: AgentUsageEntry): number | null {
  const prices = ANTHROPIC_PRICES[entry.model];
  if (!prices) return null;
  return (
    (entry.total_input_tokens / 1_000_000) * prices.input +
    (entry.total_output_tokens / 1_000_000) * prices.output
  );
}

interface AgentRankItem {
  agentId: string;
  model: string;
  calls: number;
  totalTokens: number;
}

/** Token 消耗统计面板，展示总 token、模型分布、Top 5 Agent、成本估算、缓存命中率 */
export default function TokenDashboard({ runId, agentUsage, loading }: TokenDashboardProps) {
  const totals = agentUsage?.totals;
  const hasData = totals !== undefined && totals.calls > 0;

  /** 总 token = input + output + cache_creation + cache_read */
  const totalTokens = useMemo(() => {
    if (!totals) return 0;
    return (
      totals.total_input_tokens +
      totals.total_output_tokens +
      totals.total_cache_creation_input_tokens +
      totals.total_cache_read_input_tokens
    );
  }, [totals]);

  const animatedTotal = useAnimatedNumber(totalTokens);

  /** 按 model 分组聚合 token 消耗 */
  const modelDistribution = useMemo(() => {
    if (!agentUsage) return [];
    const map = new Map<string, number>();
    for (const entry of Object.values(agentUsage.agents)) {
      const current = map.get(entry.model) ?? 0;
      map.set(entry.model, current + entry.total_input_tokens + entry.total_output_tokens);
    }
    return [...map.entries()]
      .map(([model, tokens]) => ({ model, tokens }))
      .sort((a, b) => b.tokens - a.tokens);
  }, [agentUsage]);

  const modelTotalTokens = useMemo(
    () => modelDistribution.reduce((sum, m) => sum + m.tokens, 0),
    [modelDistribution],
  );

  /** Agent Top 5 排行：按 input+output token 降序 */
  const topAgents = useMemo<AgentRankItem[]>(() => {
    if (!agentUsage) return [];
    return Object.entries(agentUsage.agents)
      .map(([agentId, entry]) => ({
        agentId,
        model: entry.model,
        calls: entry.calls,
        totalTokens: entry.total_input_tokens + entry.total_output_tokens,
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 5);
  }, [agentUsage]);

  /** 成本估算：仅 Anthropic 模型计算 USD */
  const costEstimate = useMemo(() => {
    if (!agentUsage) return { total: null as number | null, hasNonAnthropic: false };
    let total = 0;
    let hasNonAnthropic = false;
    for (const entry of Object.values(agentUsage.agents)) {
      const cost = estimateCost(entry);
      if (cost === null) {
        hasNonAnthropic = true;
      } else {
        total += cost;
      }
    }
    return { total, hasNonAnthropic };
  }, [agentUsage]);

  /** 缓存命中率 = cache_read / (cache_read + input) * 100% */
  const cacheHitRate = useMemo(() => {
    if (!totals) return 0;
    const denominator = totals.total_cache_read_input_tokens + totals.total_input_tokens;
    if (denominator === 0) return 0;
    return (totals.total_cache_read_input_tokens / denominator) * 100;
  }, [totals]);

  // 加载中且无历史数据
  if (loading && !agentUsage) {
    return (
      <Card size="small" style={{ borderRadius: 18, marginBottom: 16 }}>
        <Spin />
      </Card>
    );
  }

  // 空状态
  if (!hasData) {
    return (
      <Card size="small" style={{ borderRadius: 18, marginBottom: 16 }}>
        <Empty description="暂无 Token 消耗数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  const costDisplay = costEstimate.total !== null
    ? `$${costEstimate.total.toFixed(3)}`
    : 'N/A';

  return (
    <div style={{ marginBottom: 16 }}>
      {/* 第一行：总 Token 数 + 成本估算 + 缓存命中率 */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic
              title="总 Token 消耗"
              value={animatedTotal}
              styles={{ content: { color: 'var(--ant-color-primary)', fontSize: 28 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 18 }}>
            <Statistic
              title="成本估算 (USD)"
              value={costDisplay}
              styles={{
                content: {
                  color: costEstimate.total !== null
                    ? 'var(--ant-color-success)'
                    : 'var(--ant-color-text)',
                  fontSize: 28,
                },
              }}
            />
            {costEstimate.hasNonAnthropic && (
              <div style={{ fontSize: 11, color: 'var(--ant-color-text)', opacity: 0.5, marginTop: 4 }}>
                N/A — 非 Anthropic 模型
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--ant-color-text)', opacity: 0.6, marginBottom: 8 }}>
              缓存命中率
            </div>
            <Progress
              type="circle"
              percent={Math.round(cacheHitRate)}
              size={80}
              strokeColor="var(--ant-color-success)"
            />
          </Card>
        </Col>
      </Row>

      {/* 第二行：模型分布 + Agent Top 5 */}
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontWeight: 600, color: 'var(--ant-color-text)' }}>模型分布</span>}
            size="small"
            style={{ borderRadius: 18 }}
          >
            {modelDistribution.map(({ model, tokens }) => {
              const pct = modelTotalTokens > 0 ? (tokens / modelTotalTokens) * 100 : 0;
              return (
                <div key={model} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--ant-color-text)' }}>{model}</span>
                    <span style={{ color: 'var(--ant-color-text)', opacity: 0.6 }}>
                      {tokens.toLocaleString()} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress
                    percent={pct}
                    strokeColor="var(--ant-color-primary)"
                    railColor="var(--ant-color-fill-tertiary)"
                    showInfo={false}
                  />
                </div>
              );
            })}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontWeight: 600, color: 'var(--ant-color-text)' }}>Agent Top 5</span>}
            size="small"
            style={{ borderRadius: 18 }}
          >
            <Table<AgentRankItem>
              dataSource={topAgents}
              rowKey="agentId"
              pagination={false}
              size="small"
              columns={[
                {
                  title: '排名',
                  dataIndex: 'agentId',
                  width: 60,
                  render: (_unknown, _record, index) => index + 1,
                },
                {
                  title: 'Agent',
                  dataIndex: 'agentId',
                  ellipsis: true,
                },
                {
                  title: '调用',
                  dataIndex: 'calls',
                  width: 60,
                },
                {
                  title: 'Token',
                  dataIndex: 'totalTokens',
                  width: 100,
                  render: (value: number) => value.toLocaleString(),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
