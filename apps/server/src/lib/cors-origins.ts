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

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(part => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some(part => !Number.isFinite(part) || part < 0 || part > 255)) {
    return false;
  }

  if (parts[0] === 10) {
    return true;
  }
  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }
  if (parts[0] === 169 && parts[1] === 254) {
    return true;
  }

  return false;
}

function isAllowedDevPort(port: string): boolean {
  const webDevPort = String(parseDevPort(process.env.WEB_DEV_PORT, APP_PORTS.web));
  const adminDevPort = String(parseDevPort(process.env.ADMIN_DEV_PORT, APP_PORTS.admin));
  return port === webDevPort || port === adminDevPort;
}

/**
 * 开发态用于放行局域网访问：
 * - localhost / 127.0.0.1 / ::1：允许任意端口（覆盖 Flutter Web 等非标准端口）
 * - 私网 IPv4：端口必须是 web/admin 开发端口
 */
export function isAllowedDevCorsOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (isLoopbackHost(hostname)) {
      return true;
    }

    if (isPrivateIpv4(hostname)) {
      return isAllowedDevPort(parsed.port);
    }

    return false;
  } catch {
    return false;
  }
}
