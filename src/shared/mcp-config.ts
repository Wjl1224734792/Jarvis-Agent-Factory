/**
 * MCP 配置共享模块
 * 提供 .mcp.json 的读/写/版本查询能力
 *
 * 职责：
 * - 将 .mcp.json 的原始文件操作集中在此模块
 * - 业务方通过本项目 API 访问，不直接使用 fs 操作 .mcp.json
 *
 * @packageDocumentation
 */

import { resolve, dirname } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

/** MCP 服务器配置项 */
export interface McpServerConfig {
  type?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  [key: string]: unknown;
}

/** .mcp.json 文件顶层结构 */
export interface McpConfig {
  version?: string;
  mcpServers?: Record<string, McpServerConfig>;
}

/** .mcp.json 文件名 */
const MCP_CONFIG_FILE = '.mcp.json';

/**
 * 从项目根目录读取 .mcp.json
 *
 * @param projectRoot - 项目根目录（包含 .mcp.json 的目录）
 * @returns 解析后的 McpConfig 对象，文件不存在或 JSON 无效时返回 null
 */
export function readMcpConfig(projectRoot: string): McpConfig | null {
  const filePath = resolve(projectRoot, MCP_CONFIG_FILE);
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content) as McpConfig;
    return parsed;
  } catch {
    // JSON 解析失败（文件损坏等），返回 null
    return null;
  }
}

/**
 * 将 McpConfig 写入项目根目录的 .mcp.json
 *
 * @param projectRoot - 目标项目根目录
 * @param config - 要写入的配置对象
 */
export function writeMcpConfig(projectRoot: string, config: McpConfig): void {
  const filePath = resolve(projectRoot, MCP_CONFIG_FILE);
  const dir = dirname(filePath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, JSON.stringify(config, null, 2));
}

/**
 * 获取配置版本号
 *
 * @param config - McpConfig 对象
 * @returns version 字段值，若不存在则返回 "1.0"
 */
export function getConfigVersion(config: McpConfig): string {
  return config.version ?? '1.0';
}
