/**
 * TASK-002: 质量门禁配置与引擎逻辑 — TDD 测试（12 个用例）
 *
 * Red→Green→Refactor 流程：此文件先写 RED 测试，再创建实现让它们变 GREEN。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve, join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

// ============================================================
// 辅助函数：为每个测试创建临时目录和 quality-gates.yml
// ============================================================
let tmpDir: string;
let counter = 0;

function createTempDir() {
  const dir = resolve(tmpdir(), `jarvis-qg-test-${Date.now()}-${counter++}-${Math.random().toString(36).slice(2, 8)}`);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  // 确保 .jarvis 子目录存在
  const jarvisDir = join(dir, '.jarvis');
  if (!existsSync(jarvisDir)) mkdirSync(jarvisDir, { recursive: true });
  return dir;
}

function writeQualityGates(dir: string, content: string) {
  const jarvisDir = join(dir, '.jarvis');
  if (!existsSync(jarvisDir)) mkdirSync(jarvisDir, { recursive: true });
  writeFileSync(join(jarvisDir, 'quality-gates.yml'), content, 'utf-8');
}

function cleanup(dir: string) {
  try {
    const qgFile = join(dir, '.jarvis', 'quality-gates.yml');
    if (existsSync(qgFile)) unlinkSync(qgFile);
    const jarvisDir = join(dir, '.jarvis');
    if (existsSync(jarvisDir)) rmdirSync(jarvisDir);
    if (existsSync(dir)) rmdirSync(dir);
  } catch { /* best effort cleanup */ }
}

// ============================================================
// 测试目标模块 — lazy require 以便在实现文件创建后加载
// ============================================================
let loadQualityGates: (projectRoot: string) => any;
let evaluateQualityGate: (profile: any, metrics: Record<string, number>) => any;

beforeEach(() => {
  tmpDir = createTempDir();
  // 每次测试前刷新模块缓存，确保新的路径生效
  vi.resetModules();
});

afterEach(() => {
  cleanup(tmpDir);
});

async function loadModule() {
  const mod = await import('../src/engine/quality-gate.js');
  loadQualityGates = mod.loadQualityGates;
  evaluateQualityGate = mod.evaluateQualityGate;
}

// ============================================================
// 测试 1-4: loadQualityGates — 配置加载与降级路径
// ============================================================
describe('TASK-002: loadQualityGates — 配置加载与降级路径', () => {
  it('1. 文件缺失 → 返回 DEFAULT 配置（source=DEFAULT）', async () => {
    await loadModule();
    const dirWithoutConfig = createTempDir();
    const result = loadQualityGates(dirWithoutConfig);
    expect(result.source).toBe('DEFAULT');
    expect(result.profileName).toBe('default');
    expect(result.thresholds).toBeDefined();
    expect(result.thresholds.unit_test_coverage).toBe(80);
    expect(result.thresholds.unit_test_pass_rate).toBe(100);
    expect(result.thresholds.security_critical).toBe(0);
    expect(result.thresholds.security_high).toBe(2);
    cleanup(dirWithoutConfig);
  });

  it('2. 文件存在且合法 → 返回 PROJECT 配置（source=PROJECT）', async () => {
    await loadModule();
    writeQualityGates(tmpDir, `version: "1.0"
profiles:
  default:
    unit_test_coverage: 85
    unit_test_pass_rate: 95
    integration_test_pass_rate: 90
    e2e_test_pass_rate: 80
    lint_errors: 5
    type_errors: 0
    security_critical: 0
    security_high: 3
    performance_regression_pct: 15
`);
    const result = loadQualityGates(tmpDir);
    expect(result.source).toBe('PROJECT');
    expect(result.profileName).toBe('default');
    expect(result.thresholds.unit_test_coverage).toBe(85);
    expect(result.thresholds.unit_test_pass_rate).toBe(95);
    expect(result.thresholds.integration_test_pass_rate).toBe(90);
    expect(result.thresholds.lint_errors).toBe(5);
    expect(result.thresholds.security_high).toBe(3);
  });

  it('3. YAML 语法错误 → 回退 DEFAULT（source=FALLBACK + parseError）', async () => {
    await loadModule();
    // 故意写非法 YAML（Tab 缩进）
    writeQualityGates(tmpDir, 'version: "1.0"\nprofiles:\n\tbad: [');
    const result = loadQualityGates(tmpDir);
    expect(result.source).toBe('FALLBACK');
    expect(result.parseError).toBeTruthy();
    expect(result.thresholds.unit_test_coverage).toBe(80); // 回退默认值
  });

  it('4. 自定义阈值 < 默认值 50% → FALLBACK（硬约束）', async () => {
    await loadModule();
    // unit_test_coverage 默认 80%，50% 下限 = 40%。设为 30% 触发 FALLBACK
    writeQualityGates(tmpDir, `version: "1.0"
profiles:
  default:
    unit_test_coverage: 30
    unit_test_pass_rate: 100
    integration_test_pass_rate: 100
    e2e_test_pass_rate: 100
    lint_errors: 0
    type_errors: 0
    security_critical: 0
    security_high: 2
    performance_regression_pct: 10
`);
    const result = loadQualityGates(tmpDir);
    // 30% < 40% (50% of default 80%) → 应回退
    expect(result.source).toBe('FALLBACK');
    expect(result.thresholds.unit_test_coverage).toBe(80); // 回退到默认
  });
});

// ============================================================
// 测试 5-10: evaluateQualityGate — 条件比对与 block/warn 逻辑
// ============================================================
describe('TASK-002: evaluateQualityGate — 门禁判定逻辑', () => {
  /** 获取默认 profile 用于 evaluate 测试 */
  async function getDefaultProfile() {
    await loadModule();
    return loadQualityGates(tmpDir); // 无文件 = DEFAULT
  }

  it('5. 全部达标 → passed=true, violations=[]', async () => {
    const profile = await getDefaultProfile();
    const metrics = {
      unit_test_coverage: 85,
      unit_test_pass_rate: 100,
      integration_test_pass_rate: 100,
      e2e_test_pass_rate: 100,
      lint_errors: 0,
      type_errors: 0,
      security_critical: 0,
      security_high: 0,
      performance_regression_pct: 5,
    };
    const result = evaluateQualityGate(profile, metrics);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.profileSource).toBe('DEFAULT');
  });

  it('6. 覆盖率低于阈值 → passed=false + violations 含 coverage 阻断', async () => {
    const profile = await getDefaultProfile();
    const metrics = {
      unit_test_coverage: 62,      // 低于 80%
      unit_test_pass_rate: 100,
      integration_test_pass_rate: 100,
      e2e_test_pass_rate: 100,
      lint_errors: 0,
      type_errors: 0,
      security_critical: 0,
      security_high: 0,
      performance_regression_pct: 5,
    };
    const result = evaluateQualityGate(profile, metrics);
    expect(result.passed).toBe(false);
    const covViolation = result.violations.find(v => v.metric === 'unit_test_coverage');
    expect(covViolation).toBeDefined();
    expect(covViolation.severity).toBe('block');
    expect(covViolation.actual).toBe(62);
    expect(covViolation.threshold).toBe(80);
  });

  it('7. 安全高危漏洞 > 0 → passed=false（security_critical 强制阻断）', async () => {
    const profile = await getDefaultProfile();
    const metrics = {
      unit_test_coverage: 85,
      unit_test_pass_rate: 100,
      integration_test_pass_rate: 100,
      e2e_test_pass_rate: 100,
      lint_errors: 0,
      type_errors: 0,
      security_critical: 2,  // 发现 2 个严重漏洞
      security_high: 0,
      performance_regression_pct: 5,
    };
    const result = evaluateQualityGate(profile, metrics);
    expect(result.passed).toBe(false);
    const secViolation = result.violations.find(v => v.metric === 'security_critical');
    expect(secViolation).toBeDefined();
    expect(secViolation.severity).toBe('block');
  });

  it('8. 安全 high 超阈值 → passed=true 但有 warnings', async () => {
    const profile = await getDefaultProfile();
    // security_high 默认阈值是 2（warn 级别）
    const metrics = {
      unit_test_coverage: 85,
      unit_test_pass_rate: 100,
      integration_test_pass_rate: 100,
      e2e_test_pass_rate: 100,
      lint_errors: 0,
      type_errors: 0,
      security_critical: 0,
      security_high: 4,  // 超过阈值 2
      performance_regression_pct: 5,
    };
    const result = evaluateQualityGate(profile, metrics);
    expect(result.passed).toBe(true); // warn 不阻断
    expect(result.warnings).toBeDefined();
    const warnViolation = result.warnings.find(v => v.metric === 'security_high');
    expect(warnViolation).toBeDefined();
    expect(warnViolation.severity).toBe('warn');
  });

  it('9. lint_errors > 0 → passed=false（代码质量阻断）', async () => {
    const profile = await getDefaultProfile();
    const metrics = {
      unit_test_coverage: 85,
      unit_test_pass_rate: 100,
      integration_test_pass_rate: 100,
      e2e_test_pass_rate: 100,
      lint_errors: 3,  // 存在 3 个 lint 错误
      type_errors: 0,
      security_critical: 0,
      security_high: 0,
      performance_regression_pct: 5,
    };
    const result = evaluateQualityGate(profile, metrics);
    expect(result.passed).toBe(false);
    const lintViolation = result.violations.find(v => v.metric === 'lint_errors');
    expect(lintViolation).toBeDefined();
    expect(lintViolation.severity).toBe('block');
  });

  it('10. 覆盖率精确等于阈值 → passed=true（边界 >= 成立）', async () => {
    const profile = await getDefaultProfile();
    const metrics = {
      unit_test_coverage: 80,  // 精确等于阈值
      unit_test_pass_rate: 100,
      integration_test_pass_rate: 100,
      e2e_test_pass_rate: 100,
      lint_errors: 0,
      type_errors: 0,
      security_critical: 0,
      security_high: 0,
      performance_regression_pct: 10, // 精确等于阈值
    };
    const result = evaluateQualityGate(profile, metrics);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ============================================================
// 测试 11-12: checkpoints 表扩展 — violations + quality_profile_source
// ============================================================
describe('TASK-002: checkpoints 表扩展（violations + quality_profile_source）', () => {
  it('11. addCheckpoint 支持 violations JSON 和 quality_profile_source 写入', async () => {
    const { openDb, addCheckpoint, getCheckpoints } = await import('../src/engine/db.js');
    const { evaluateQualityGate } = await import('../src/engine/quality-gate.js');
    const { loadQualityGates } = await import('../src/engine/quality-gate.js');

    const dbPath = resolve(tmpdir(), `jarvis-qg-test-db-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
    const db = openDb(dbPath);
    const sessionId = 'test_session_qg_' + Date.now();

    // 模拟一次失败的 gate 检查
    const profile = loadQualityGates(tmpDir); // 默认 profile
    const metrics = {
      unit_test_coverage: 55,
      unit_test_pass_rate: 100,
      integration_test_pass_rate: 100,
      e2e_test_pass_rate: 100,
      lint_errors: 0,
      type_errors: 0,
      security_critical: 0,
      security_high: 0,
      performance_regression_pct: 5,
    };
    const evalResult = evaluateQualityGate(profile, metrics);
    expect(evalResult.passed).toBe(false);

    // 写入 checkpoint（扩展签名：violations + qualityProfileSource）
    const violations = JSON.stringify(evalResult.violations);
    const qualityProfileSource = evalResult.profileSource;

    // --- 实际调用扩展后的 addCheckpoint ---
    addCheckpoint(db, 'Gate C2', null, sessionId, undefined, violations, qualityProfileSource);

    // 验证写入
    const checkpoints = getCheckpoints(db, 'Gate C2', sessionId);
    expect(checkpoints).toHaveLength(1);
    const cp = checkpoints[0];
    expect(cp.violations).toBe(violations);
    expect(cp.quality_profile_source).toBe(qualityProfileSource);

    // 清理
    try { unlinkSync(dbPath); } catch {}
  });

  it('12. addCheckpoint 兼容旧调用（无 violations/quality_profile_source 参数）', async () => {
    const { openDb, addCheckpoint, getCheckpoints } = await import('../src/engine/db.js');

    const dbPath = resolve(tmpdir(), `jarvis-qg-test-db-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
    const db = openDb(dbPath);
    const sessionId = 'test_session_qg_legacy_' + Date.now();

    // 旧签名调用（无 violations 和 quality_pair_source）
    addCheckpoint(db, 'Gate A', 'Gate B-DDD', sessionId);

    const checkpoints = getCheckpoints(db, 'Gate A', sessionId);
    expect(checkpoints).toHaveLength(1);
    const cp = checkpoints[0];
    expect(cp.gate).toBe('Gate A');
    expect(cp.advance_to).toBe('Gate B-DDD');
    // violations 和 quality_profile_source 应为 null（新增列的默认值）
    expect(cp.violations).toBeNull();
    expect(cp.quality_profile_source).toBeNull();

    // 清理
    try { unlinkSync(dbPath); } catch {}
  });
});
