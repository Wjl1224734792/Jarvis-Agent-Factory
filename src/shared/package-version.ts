import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** 从 package.json 读取版本号，baseDir 传入 `import.meta.dirname` */
export function readPackageVersion(baseDir: string): string {
  try {
    return JSON.parse(readFileSync(resolve(baseDir, '..', '..', 'package.json'), 'utf-8')).version;
  } catch {
    return '?.?.?';
  }
}
