import { resolve } from 'node:path';
import { homedir } from 'node:os';

/**
 * 获取 hash 文件的存储路径，保持 install.ts 与 cli/ 模块一致。
 *
 * - 全局模式：`~/.jarvis/file-hashes.json`
 * - 项目模式：`<target>/.jarvis/file-hashes.json`
 *
 * @param target 项目根目录（全局模式时可传任意值，不影响结果）
 * @param isGlobal 是否为全局安装
 * @returns hash 文件绝对路径
 */
export function getHashFilePath(target: string, isGlobal: boolean): string {
  return isGlobal
    ? resolve(homedir(), '.jarvis', 'file-hashes.json')
    : resolve(target, '.jarvis', 'file-hashes.json');
}
