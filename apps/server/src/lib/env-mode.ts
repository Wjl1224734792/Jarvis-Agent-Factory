/** 标准化的 NODE_ENV 值。未设置或不可识别时返回空字符串。 */
export type EnvMode = "development" | "test" | "production" | "";

/** 解析并缓存 NODE_ENV，每次进程生命周期内一致。 */
export function getEnvMode(): EnvMode {
  const raw = (process.env.NODE_ENV ?? "").trim().toLowerCase();
  if (raw === "development" || raw === "dev") return "development";
  if (raw === "test") return "test";
  if (raw === "production" || raw === "prod") return "production";
  return "";
}

export function isDevEnv(): boolean {
  return getEnvMode() === "development";
}

export function isTestEnv(): boolean {
  return getEnvMode() === "test";
}

export function isProductionEnv(): boolean {
  return getEnvMode() === "production";
}

/** 在显式 dev 或 test 环境中返回 true（非生产安全上下文）。 */
export function isNonProductionEnv(): boolean {
  const mode = getEnvMode();
  return mode === "development" || mode === "test";
}

/** NODE_ENV 未设置或不是可识别值时返回 true。 */
export function isUnknownEnv(): boolean {
  return getEnvMode() === "";
}
