import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

let envLoaded = false;

/**
 * 尝试从指定路径加载 .env 文件。
 *
 * @param filePath - .env 文件绝对路径
 * @param override - 是否覆盖已存在的环境变量。基础 .env 为 false（命令行优先），
 *   .env.{NODE_ENV} 为 true（环境特定文件优先级最高）。
 */
function tryLoadEnvFile(filePath: string, override: boolean = false) {
  if (!existsSync(filePath)) {
    return;
  }

  dotenv.config({ path: filePath, override });
}

/**
 * 查找根目录 .env 文件（支持从 apps/server 或仓库根目录启动）。
 */
function findRootEnvDir(): string {
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "..", "..")
  ];

  for (const dir of candidates) {
    if (existsSync(resolve(dir, ".env"))) {
      return dir;
    }
  }

  return process.cwd();
}

export function ensureServerEnvLoaded() {
  if (envLoaded) {
    return;
  }

  const rootDir = findRootEnvDir();

  // 1) 加载公共 .env（override: false，命令行/系统 env 优先）
  tryLoadEnvFile(resolve(rootDir, ".env"), false);

  // 2) 加载环境专属 .env.{NODE_ENV}（override: true，环境覆盖优先）
  //    NODE_ENV 可能来自命令行/系统 env，也可能来自第 1 步加载的 .env
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv) {
    tryLoadEnvFile(resolve(rootDir, `.env.${nodeEnv}`), true);
  }

  envLoaded = true;
}
