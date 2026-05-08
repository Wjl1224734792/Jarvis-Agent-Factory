// 此文件仅供 npm bin 包装器调用（npm install -g 后自动生成 .cmd/.ps1）
// 不直接执行：npm 在 Windows 上生成 jarvis.cmd 调用 node 启动
import { run } from '../dist/src/cli.js';

run().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
