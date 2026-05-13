/**
 * TASK-002: 质量门禁配置与引擎逻辑
 *
 * 提供质量门禁的 YAML 配置加载、解析、校验、以及逐条件比对判定。
 * 降级路径：
 *   文件缺失 → DEFAULT
 *   YAML 解析错误 → FALLBACK + parseError
 *   自定义阈值 < 默认值 50% → FALLBACK（硬约束）
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

// ============================================================
// 类型定义
// ============================================================

/** 质量指标的阈值结构 */
export interface QualityThreshold {
  unit_test_coverage: number;
  unit_test_pass_rate: number;
  integration_test_pass_rate: number;
  e2e_test_pass_rate: number;
  lint_errors: number;
  type_errors: number;
  security_critical: number;
  security_high: number;
  performance_regression_pct: number;
}

/** 配置来源 */
export type QualityProfileSource = 'DEFAULT' | 'PROJECT' | 'FALLBACK';

/** 质量门禁配置档案 */
export interface QualityProfile {
  source: QualityProfileSource;
  profileName: string;
  thresholds: QualityThreshold;
  /** YAML 解析失败时填入错误信息 */
  parseError?: string;
}

/** 单个违反项 */
export interface Violation {
  metric: string;
  actual: number;
  threshold: number;
  operator: '>=' | '<=';
  severity: 'block' | 'warn';
  message: string;
}

/** 门禁判定结果 */
export interface EvaluationResult {
  passed: boolean;
  violations: Violation[];
  warnings: Violation[];
  profileSource: QualityProfileSource;
}

// ============================================================
// 默认阈值（内置硬编码，文件缺失时使用）
// ============================================================

const DEFAULT_THRESHOLDS: QualityThreshold = {
  unit_test_coverage: 80,
  unit_test_pass_rate: 100,
  integration_test_pass_rate: 100,
  e2e_test_pass_rate: 100,
  lint_errors: 0,
  type_errors: 0,
  security_critical: 0,
  security_high: 2,
  performance_regression_pct: 10,
};

const QG_FILE = '.jarvis/quality-gates.yml';

// ============================================================
// 指标比较规则定义
// ============================================================

/**
 * 每个质量指标的比较规则。
 * - operator: 如何比较（>= 表示实际值应大于等于阈值；<= 表示实际值应小于等于阈值）
 * - severity: 不满足时的严重级别（block=阻断，warn=警告但放行）
 */
const METRIC_RULES: Record<keyof QualityThreshold, { operator: '>=' | '<='; severity: 'block' | 'warn'; label: string }> = {
  unit_test_coverage:         { operator: '>=', severity: 'block', label: '单元测试覆盖率' },
  unit_test_pass_rate:        { operator: '>=', severity: 'block', label: '单元测试通过率' },
  integration_test_pass_rate: { operator: '>=', severity: 'block', label: '集成测试通过率' },
  e2e_test_pass_rate:         { operator: '>=', severity: 'block', label: 'E2E测试通过率' },
  lint_errors:                { operator: '<=', severity: 'block', label: 'Lint错误数' },
  type_errors:                { operator: '<=', severity: 'block', label: '类型错误数' },
  security_critical:          { operator: '<=', severity: 'block', label: '严重安全漏洞' },
  security_high:              { operator: '<=', severity: 'warn',  label: '高危安全漏洞' },
  performance_regression_pct: { operator: '<=', severity: 'block', label: '性能回归百分比' },
};

// ============================================================
// 配置加载
// ============================================================

/**
 * 从项目根目录加载 quality-gates.yml 配置。
 * 降级路径：
 * 1. 文件不存在 → DEFAULT
 * 2. YAML 解析成功但阈值 < 默认值 50% → FALLBACK
 * 3. YAML 解析失败 → FALLBACK
 *
 * @param projectRoot 项目根目录绝对路径
 * @returns QualityProfile 配置档案
 */
export function loadQualityGates(projectRoot: string): QualityProfile {
  const configPath = resolve(projectRoot, QG_FILE);

  // 文件不存在 → DEFAULT
  if (!existsSync(configPath)) {
    return {
      source: 'DEFAULT',
      profileName: 'default',
      thresholds: { ...DEFAULT_THRESHOLDS },
    };
  }

  let raw: any;
  try {
    const content = readFileSync(configPath, 'utf-8');
    raw = parse(content);
  } catch (err: any) {
    // YAML 解析失败 → FALLBACK
    console.error(`[quality-gate] 解析 quality-gates.yml 失败: ${err.message}`);
    return {
      source: 'FALLBACK',
      profileName: 'default',
      thresholds: { ...DEFAULT_THRESHOLDS },
      parseError: err.message || String(err),
    };
  }

  // 提取 default profile
  const profileData = raw?.profiles?.default;
  if (!profileData || typeof profileData !== 'object') {
    return {
      source: 'FALLBACK',
      profileName: 'default',
      thresholds: { ...DEFAULT_THRESHOLDS },
      parseError: 'profiles.default 缺失或格式错误',
    };
  }

  // 合并项目值到默认值（项目文件只需覆盖需要的字段）
  const merged: QualityThreshold = { ...DEFAULT_THRESHOLDS };

  for (const key of Object.keys(DEFAULT_THRESHOLDS) as Array<keyof QualityThreshold>) {
    if (typeof profileData[key] === 'number') {
      merged[key] = profileData[key];
    }
  }

  // 硬约束：自定义阈值不可低于默认值的 50%
  if (isBelowHalf(merged)) {
    console.error('[quality-gate] 项目自定义阈值低于默认值 50%，已回退到默认值');
    return {
      source: 'FALLBACK',
      profileName: 'default',
      thresholds: { ...DEFAULT_THRESHOLDS },
      parseError: '自定义阈值低于默认值 50%',
    };
  }

  return {
    source: 'PROJECT',
    profileName: 'default',
    thresholds: merged,
  };
}

/**
 * 检查是否存在低于默认值 50% 的阈值。
 * 仅对"实际值 >= 阈值"类指标（覆盖率/通过率）生效——
 * lint_errors/type_errors/security 类指标的下限固定为 0，不做 50% 判定。
 *
 * @param thresholds 项目自定义阈值
 * @returns true 表示存在低于 50% 下限的阈值
 */
function isBelowHalf(thresholds: QualityThreshold): boolean {
  // "实际值 >= 阈值"类指标：阈值不可低于默认值的 50%
  const halfCheckKeys: Array<keyof QualityThreshold> = [
    'unit_test_coverage',
    'unit_test_pass_rate',
    'integration_test_pass_rate',
    'e2e_test_pass_rate',
  ];

  for (const key of halfCheckKeys) {
    const defaultValue = DEFAULT_THRESHOLDS[key];
    const projectValue = thresholds[key];
    const lowerBound = defaultValue * 0.5;

    if (projectValue < lowerBound) {
      return true;
    }
  }

  return false;
}

// ============================================================
// 门禁判定
// ============================================================

/**
 * 根据质量档案和实际指标数据执行门禁判定。
 *
 * @param profile 质量门禁配置档案
 * @param metrics 实际测量指标值（部分传递亦可，缺失指标不参与比较）
 * @returns EvaluationResult 判定结果
 */
export function evaluateQualityGate(
  profile: QualityProfile,
  metrics: Record<string, number>,
): EvaluationResult {
  const violations: Violation[] = [];
  const warnings: Violation[] = [];

  for (const [metric, actual] of Object.entries(metrics)) {
    if (actual === undefined || actual === null) continue;

    const rule = METRIC_RULES[metric as keyof QualityThreshold];
    if (!rule) continue;

    const threshold = profile.thresholds[metric as keyof QualityThreshold];
    if (threshold === undefined) continue;

    let failed = false;
    if (rule.operator === '>=') {
      failed = actual < threshold;
    } else if (rule.operator === '<=') {
      failed = actual > threshold;
    }

    if (failed) {
      const violation: Violation = {
        metric,
        actual,
        threshold,
        operator: rule.operator,
        severity: rule.severity,
        message: `[${rule.label}] 实际值 ${actual} ${rule.operator === '>=' ? '<' : '>'} 阈值 ${threshold}`,
      };

      if (rule.severity === 'block') {
        violations.push(violation);
      } else {
        warnings.push(violation);
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
    profileSource: profile.source,
  };
}
