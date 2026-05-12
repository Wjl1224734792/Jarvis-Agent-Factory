import { describe, it, expect, vi } from 'vitest';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

// ---- Mock node:os homedir 指向固定临时目录，确保路径可预测 ----
const MOCK_HOME = join(tmpdir(), 'jarvis-test-hash-home');

vi.mock('node:os', async (importOriginal) => {
  const mod = await importOriginal<typeof import('node:os')>();
  return {
    ...mod,
    homedir: () => MOCK_HOME,
  };
});

import { getHashFilePath } from '../src/hash-paths.js';

describe('getHashFilePath', () => {
  it('全局模式返回 ~/.jarvis/file-hashes.json', () => {
    const hashPath = getHashFilePath('.', true);
    const expected = resolve(MOCK_HOME, '.jarvis', 'file-hashes.json');
    expect(hashPath).toBe(expected);
  });

  it('项目模式返回 <target>/.jarvis/file-hashes.json', () => {
    const projectDir = join(tmpdir(), 'my-test-project');
    const hashPath = getHashFilePath(projectDir, false);
    const expected = resolve(projectDir, '.jarvis', 'file-hashes.json');
    expect(hashPath).toBe(expected);
  });

  it('全局模式下 target 参数不影响结果', () => {
    const path1 = getHashFilePath('.', true);
    const path2 = getHashFilePath('/some/random/path', true);
    expect(path1).toBe(path2);
  });

  it('项目模式下不同 target 返回不同路径', () => {
    const path1 = getHashFilePath(join(tmpdir(), 'project-a'), false);
    const path2 = getHashFilePath(join(tmpdir(), 'project-b'), false);
    expect(path1).not.toBe(path2);
  });

  it('返回的路径是绝对路径', () => {
    const globalPath = getHashFilePath('.', true);
    const projectPath = getHashFilePath('./relative-project', false);
    // resolve 始终返回绝对路径（Windows 含盘符，Unix 以 / 开头）
    for (const p of [globalPath, projectPath]) {
      expect(p.startsWith('/') || /^[A-Z]:/.test(p)).toBe(true);
    }
  });

  it('全局和项目路径不同（各自独立）', () => {
    const projectDir = join(tmpdir(), 'some-project');
    const globalPath = getHashFilePath(projectDir, true);
    const projectPath = getHashFilePath(projectDir, false);
    expect(globalPath).not.toBe(projectPath);
  });
});
