import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  readMcpConfig,
  writeMcpConfig,
  getConfigVersion,
} from '../src/shared/mcp-config.js';

describe('McpConfig 共享模块', () => {
  /** 临时项目根目录（每次测试独立） */
  let projectRoot: string;

  beforeEach(() => {
    // 创建临时目录作为 "项目根目录"
    projectRoot = mkdtempSync(join(tmpdir(), 'mcp-config-test-'));
  });

  afterEach(() => {
    // 清理临时目录
    if (existsSync(projectRoot)) {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  // ---- readMcpConfig ----

  describe('readMcpConfig', () => {
    it('项目根目录下无 .mcp.json 时应返回 null', () => {
      const result = readMcpConfig(projectRoot);
      expect(result).toBeNull();
    });

    it('应读取有效的 .mcp.json 并返回 McpConfig 对象', () => {
      const configData = {
        mcpServers: {
          test: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@test/mcp'],
          },
        },
      };
      writeFileSync(join(projectRoot, '.mcp.json'), JSON.stringify(configData, null, 2));

      const result = readMcpConfig(projectRoot);
      expect(result).not.toBeNull();
      expect(result!.mcpServers).toBeDefined();
      expect(result!.mcpServers!.test).toBeDefined();
      expect(result!.mcpServers!.test.command).toBe('npx');
    });

    it('无效 JSON 时应返回 null', () => {
      writeFileSync(join(projectRoot, '.mcp.json'), 'not-valid-json{{{');

      const result = readMcpConfig(projectRoot);
      expect(result).toBeNull();
    });

    it('应读取包含 version 字段的 .mcp.json', () => {
      const configData = {
        version: '2.0',
        mcpServers: {},
      };
      writeFileSync(join(projectRoot, '.mcp.json'), JSON.stringify(configData, null, 2));

      const result = readMcpConfig(projectRoot);
      expect(result).not.toBeNull();
      expect(result!.version).toBe('2.0');
    });
  });

  // ---- writeMcpConfig ----

  describe('writeMcpConfig', () => {
    it('应写入 .mcp.json 到项目根目录', () => {
      const config = {
        mcpServers: {
          'jarvis-engine': {
            type: 'stdio',
            command: 'jarvis',
            args: ['engine', 'start', '--stdio'],
          },
        },
      };

      writeMcpConfig(projectRoot, config);

      const filePath = join(projectRoot, '.mcp.json');
      expect(existsSync(filePath)).toBe(true);

      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(content.mcpServers).toBeDefined();
      expect(content.mcpServers['jarvis-engine'].command).toBe('jarvis');
    });

    it('应覆盖已存在的 .mcp.json', () => {
      // 先写一个旧配置
      const oldConfig = { mcpServers: { old: { command: 'old-cmd' } } };
      writeMcpConfig(projectRoot, oldConfig);

      // 再写一个新配置
      const newConfig = { mcpServers: { 'jarvis-engine': { command: 'jarvis' } } };
      writeMcpConfig(projectRoot, newConfig);

      const content = JSON.parse(readFileSync(join(projectRoot, '.mcp.json'), 'utf-8'));
      expect(content.mcpServers.old).toBeUndefined();
      expect(content.mcpServers['jarvis-engine'].command).toBe('jarvis');
    });

    it('写入的 JSON 格式应为 2 空格缩进', () => {
      const config = { mcpServers: {} };
      writeMcpConfig(projectRoot, config);

      const content = readFileSync(join(projectRoot, '.mcp.json'), 'utf-8');
      // JSON.stringify 默认 2 空格缩进
      const expected = JSON.stringify(config, null, 2);
      expect(content).toBe(expected);
    });
  });

  // ---- getConfigVersion ----

  describe('getConfigVersion', () => {
    it('有 version 字段时返回该值', () => {
      const config = { version: '2.0', mcpServers: {} };
      expect(getConfigVersion(config)).toBe('2.0');
    });

    it('无 version 字段时返回默认值 "1.0"', () => {
      const config = { mcpServers: {} };
      expect(getConfigVersion(config)).toBe('1.0');
    });

    it('空配置无 version 字段时返回默认值', () => {
      const config = {};
      expect(getConfigVersion(config)).toBe('1.0');
    });
  });
});
