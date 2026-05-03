const TRUTHY_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSY_ENV_VALUES = new Set(['0', 'false', 'no', 'off']);

function normalizeEnvValue(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();

  return normalized ? normalized : undefined;
}

/**
 * 判断环境变量是否命中项目约定的真值集合。
 *
 * @param value 原始环境变量值。
 * @returns 仅当值为 `1/true/yes/on` 时返回 `true`。
 * @throws {never} 该函数只做纯字符串判断，不会抛出异常。
 */
export function isTruthyEnvValue(value: string | undefined): boolean {
  const normalized = normalizeEnvValue(value);

  return normalized ? TRUTHY_ENV_VALUES.has(normalized) : false;
}

/**
 * 解析带默认值的布尔环境变量。
 *
 * @param value 原始环境变量值。
 * @param fallback 未配置时回退的默认值。
 * @returns 配置值命中真值集合时返回 `true`，未配置时返回 `fallback`，其他值返回 `false`。
 * @throws {never} 该函数只做纯字符串判断，不会抛出异常。
 */
export function parseBooleanEnv(
  value: string | undefined,
  fallback: boolean
): boolean {
  const normalized = normalizeEnvValue(value);

  if (!normalized) {
    return fallback;
  }

  return TRUTHY_ENV_VALUES.has(normalized);
}

/**
 * 解析允许显式开关的可选布尔环境变量。
 *
 * @param value 原始环境变量值。
 * @returns `true/false` 表示明确配置，`undefined` 表示未配置或值不合法。
 * @throws {never} 该函数只做纯字符串判断，不会抛出异常。
 */
export function parseOptionalBooleanEnv(
  value: string | undefined
): boolean | undefined {
  const normalized = normalizeEnvValue(value);

  if (!normalized) {
    return undefined;
  }

  if (TRUTHY_ENV_VALUES.has(normalized)) {
    return true;
  }

  if (FALSY_ENV_VALUES.has(normalized)) {
    return false;
  }

  return undefined;
}
