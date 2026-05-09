/**
 * 抑制 node:sqlite 的 ExperimentalWarning
 *
 * node:sqlite 在首次 import 时通过 process.emitWarning() 打印警告。
 * 本模块必须在任何可能触发 node:sqlite 加载的 import 之前被求值，
 * 因此须作为 cli.ts 的第一个静态 import 引入。
 *
 * ES 模块按源码导入顺序深度优先求值，本模块 monkey-patch 后，
 * 后续被导入的 engine/server.ts → engine/db.ts → node:sqlite
 * 不会再打印 SQLite 相关实验性警告。
 */

const originalEmitWarning = process.emitWarning.bind(process) as (..._args: unknown[]) => void;

process.emitWarning = ((warning: unknown, ...args: unknown[]): void => {
  // 仅抑制 SQLite 实验性警告，其余警告正常透传
  if (
    typeof warning === 'string'
    && warning.includes('SQLite')
    && args[0] === 'ExperimentalWarning'
  ) {
    return;
  }
  return originalEmitWarning(warning, ...args);
}) as typeof process.emitWarning;
