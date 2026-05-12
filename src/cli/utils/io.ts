import { createInterface } from 'node:readline';

/**
 * 交互式确认提示（Y/N）
 * @param q - 提示文本
 * @returns 用户是否确认
 */
export async function confirm(q: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<boolean>(resolve => {
    rl.question(q, a => {
      rl.close();
      resolve(a.toLowerCase() === 'y' || a.toLowerCase() === 'yes');
    });
  });
}

/**
 * 交互式文本输入
 * @param q - 提示文本
 * @returns 用户输入的字符串（已 trim）
 */
export async function question(q: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<string>(resolve => {
    rl.question(q, a => {
      rl.close();
      resolve(a.trim());
    });
  });
}
