#!/usr/bin/env node
// npm 全局安装时生成 .cmd / .ps1 / bash 包装器；bash 包装器直接 exec 此文件，需 shebang。
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(__dirname, '..', 'dist', 'src', 'cli', 'index.js');

if (existsSync(distEntry)) {
  // 生产路径：使用预编译的 dist/
  const { run } = await import(`file://${distEntry}`);
  run().catch(err => {
    console.error('❌', err.message);
    process.exit(1);
  });
} else {
  // 开发 fallback：dist/ 不存在时用 tsx 动态运行源码
  console.error('[jarvis-dev] dist/ not found, using tsx fallback...');
  const { spawn } = await import('node:child_process');
  const srcEntry = resolve(__dirname, '..', 'src', 'cli', 'index.ts');
  const args = process.argv.slice(2);
  const child = spawn('npx', ['tsx', srcEntry, ...args], { stdio: 'inherit' });
  child.on('close', (code) => process.exit(code ?? 1));
}
