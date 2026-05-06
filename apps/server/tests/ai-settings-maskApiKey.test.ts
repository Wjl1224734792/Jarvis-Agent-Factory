/**
 * maskApiKey 单元测试
 *
 * 验证 AI 配置 API Key 脱敏函数在各种边界条件下的正确性。
 * maskApiKey 规则：保留前 3 + 后 4，中间用 *** 替换；长度 <=7 时全部替换。
 *
 * @see requirement_ids: REQ-002
 * @see task_id: TEST-004
 */
import { describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock 层：隔离 DB 依赖，仅测试 maskApiKey 导出函数
// ---------------------------------------------------------------------------

vi.mock('@feijia/db', () => ({
  db: {},
  siteSettingsTable: {}
}));

vi.mock('../src/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() }
}));

vi.mock('../src/modules/ai/ai-settings.repo', () => ({
  aiSettingsRepo: {
    getAiSettingsJson: vi.fn(),
    upsertAiSettingsJson: vi.fn()
  }
}));

// ---------------------------------------------------------------------------
// 测试
// ---------------------------------------------------------------------------

describe('maskApiKey', () => {
  /**
   * 动态导入被测函数，确保 mock 已生效。
   * 每个 describe 块重新导入以避免模块缓存干扰。
   */
  async function getMaskApiKey() {
    const mod = await import('../src/modules/ai/ai-settings.service');
    return mod.maskApiKey;
  }

  // ===== 正常长度 Key =====

  it('标准长度 Key：保留前3后4，中间脱敏', async () => {
    const maskApiKey = await getMaskApiKey();
    // "sk-abc123def456ghi789" = 22 字符，> 7
    expect(maskApiKey('sk-abc123def456ghi789')).toBe('sk-***i789');
  });

  it('恰好 8 字符的 Key：保留前3后4，中间仅 1 个字符被替换', async () => {
    const maskApiKey = await getMaskApiKey();
    // "12345678" = 8 字符，slice(0,3)="123"，slice(-4)="5678"
    expect(maskApiKey('12345678')).toBe('123***5678');
  });

  it('DashScope 格式 Key（sk- 前缀）正确脱敏', async () => {
    const maskApiKey = await getMaskApiKey();
    expect(maskApiKey('sk-proj-abcdefghijklmnop')).toBe('sk-***mnop');
  });

  it('OpenAI 格式 Key（sk- 前缀，较长）正确脱敏', async () => {
    const maskApiKey = await getMaskApiKey();
    const longKey = 'sk-proj-1234567890abcdef1234567890abcdef';
    expect(maskApiKey(longKey)).toBe('sk-***cdef');
  });

  // ===== 短 Key（<= 7 字符）=====

  it('长度为 7 的 Key：全部替换为 ***', async () => {
    const maskApiKey = await getMaskApiKey();
    expect(maskApiKey('1234567')).toBe('***');
  });

  it('长度为 6 的 Key：全部替换为 ***', async () => {
    const maskApiKey = await getMaskApiKey();
    expect(maskApiKey('abcdef')).toBe('***');
  });

  it('长度为 1 的 Key：全部替换为 ***', async () => {
    const maskApiKey = await getMaskApiKey();
    expect(maskApiKey('x')).toBe('***');
  });

  // ===== 特殊字符 Key =====

  it('包含特殊字符的 Key 正确脱敏', async () => {
    const maskApiKey = await getMaskApiKey();
    expect(maskApiKey('sk-!@#$%^&*()_+-=')).toBe('sk-***_+-=');
  });

  it('包含空格的 Key 正确脱敏', async () => {
    const maskApiKey = await getMaskApiKey();
    // "ab cd ef gh ij" = 14 字符，slice(0,3)="ab "，slice(-4)="h ij"
    expect(maskApiKey('ab cd ef gh ij')).toBe('ab ***h ij');
  });

  it('纯数字 Key 正确脱敏', async () => {
    const maskApiKey = await getMaskApiKey();
    expect(maskApiKey('1234567890123456')).toBe('123***3456');
  });

  // ===== 边界值 =====

  it('长度为 9 的 Key：中间仅 2 个字符被替换', async () => {
    const maskApiKey = await getMaskApiKey();
    // "123456789" = 9 字符，前3="123"，后4="6789"
    expect(maskApiKey('123456789')).toBe('123***6789');
  });
});
