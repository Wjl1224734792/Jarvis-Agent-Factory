import { APP_PORTS } from '@feijia/shared';

/**
 * 与 Vite `parseDevPort` 对齐：合法端口 1–65535，否则使用 fallback。
 */
export function parseDevPort(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    return fallback;
  }
  return n;
}

/**
 * 未配置 `CORS_ORIGIN` 时允许的默认 Origin（localhost / 127.0.0.1 + 开发端口）。
 * 端口优先来自 `WEB_DEV_PORT` / `ADMIN_DEV_PORT`，与前端 Vite 一致。
 */
export function buildDefaultCorsOrigins(): readonly string[] {
  const webDevPort = parseDevPort(process.env.WEB_DEV_PORT, APP_PORTS.web);
  const adminDevPort = parseDevPort(process.env.ADMIN_DEV_PORT, APP_PORTS.admin);
  return [
    `http://localhost:${webDevPort}`,
    `http://127.0.0.1:${webDevPort}`,
    `http://localhost:${adminDevPort}`,
    `http://127.0.0.1:${adminDevPort}`
  ];
}
