#!/usr/bin/env node
// npm 全局安装时生成 .cmd / .ps1 / bash 包装器；bash 包装器直接 exec 此文件，需 shebang。
import { run } from '../dist/src/cli/index.js';

run().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
