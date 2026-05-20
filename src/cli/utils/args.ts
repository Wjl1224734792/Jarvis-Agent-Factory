/**
 * 解析后的 CLI 选项
 */
export interface CliOpts {
  yes: boolean;
  global: boolean;
  globalExplicit: boolean;
  help?: boolean;
  version?: boolean;
  /** DeepInit: 启用智能分派模式（深度文件分析 + 项目类型检测） */
  smart?: boolean;
  /** DeepInit: 禁用并行生成（默认启用） */
  parallel?: boolean;
  /** DeepInit: 并行任务数限制（0 = 无限制） */
  jobs?: number;
}

/**
 * 手动解析命令行参数（不引入 Commander.js，遵循 ADR-5）
 *
 * 支持的标志：
 *   -y, --yes       跳过确认
 *   -g, --global    全局安装
 *   -h, --help      显示帮助
 *   -v, --version   显示版本
 *   --smart         DeepInit 智能分派模式
 *   --no-parallel   DeepInit 禁用并行生成
 *   --jobs <n>      DeepInit 并行任务数限制
 *
 * @param raw - process.argv.slice(2) 原始参数数组
 * @returns 解析后的选项和位置参数
 */
export function parseArgs(raw: string[]): { opts: CliOpts; positional: string[] } {
  const opts: CliOpts = { yes: false, global: false, globalExplicit: false };
  const positional: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a === '-y' || a === '--yes') {
      opts.yes = true;
    } else if (a === '-g' || a === '--global') {
      opts.global = true;
      opts.globalExplicit = true;
    } else if (a === '-h' || a === '--help') {
      opts.help = true;
      return { opts, positional };
    } else if (a === '-v' || a === '--version') {
      opts.version = true;
      return { opts, positional };
    } else if (a === '--smart') {
      opts.smart = true;
    } else if (a === '--no-parallel') {
      opts.parallel = false;
    } else if (a === '--jobs' && i + 1 < raw.length) {
      const n = parseInt(raw[++i], 10);
      if (!isNaN(n) && n > 0) opts.jobs = n;
    } else if (a.startsWith('--jobs=')) {
      const n = parseInt(a.slice(7), 10);
      if (!isNaN(n) && n > 0) opts.jobs = n;
    } else {
      positional.push(a);
    }
  }

  return { opts, positional };
}
