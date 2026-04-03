import { resolve } from "node:path";
import dotenv from "dotenv";

let envLoaded = false;

/**
 * 尝试从指定路径加载 .env 文件。
 *
 * 使用 dotenv 的 override: false 确保不会覆盖已存在的环境变量。
 */
function tryLoadEnvFile(filePath: string) {
  dotenv.config({ path: filePath, override: false });
}

export function ensureDbEnvLoaded() {
  if (envLoaded) {
    return;
  }

  // 按优先级尝试加载：当前目录 → 父目录 → 祖父目录
  // dotenv 会自动跳过不存在的文件，无需手动检查
  tryLoadEnvFile(resolve(process.cwd(), ".env"));
  tryLoadEnvFile(resolve(process.cwd(), "..", ".env"));
  tryLoadEnvFile(resolve(process.cwd(), "..", "..", ".env"));

  envLoaded = true;
}
