/**
 * post-tsc 资产拷贝：package.json、模板、Web 视图 HTML（含版本注入）
 * 由 build script 在 tsc 编译后自动调用。
 */
import { cpSync, readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const version = pkg.version;

// 1. 拷贝 package.json 到 dist/
cpSync(join(root, 'package.json'), join(dist, 'package.json'));

// 2. 拷贝 src/templates → dist/src/templates
cpSync(join(root, 'src', 'templates'), join(dist, 'src', 'templates'), { recursive: true });

// 3. 拷贝 src/web/views/*.html → dist/src/web/views/，替换 __JARVIS_VERSION__
const srcViews = join(root, 'src', 'web', 'views');
const distViews = join(dist, 'src', 'web', 'views');

if (existsSync(srcViews)) {
  mkdirSync(distViews, { recursive: true });

  for (const f of readdirSync(srcViews)) {
    if (!f.endsWith('.html')) continue;
    let html = readFileSync(join(srcViews, f), 'utf-8');
    html = html.replace(/__JARVIS_VERSION__/g, version);
    writeFileSync(join(distViews, f), html);
  }

  // 4. 清理 dist 中源已删除的孤儿 HTML 文件
  if (existsSync(distViews)) {
    for (const f of readdirSync(distViews)) {
      if (f.endsWith('.html') && !existsSync(join(srcViews, f))) {
        unlinkSync(join(distViews, f));
        console.log(`  [build] removed orphan: dist/src/web/views/${f}`);
      }
    }
  }
}

console.log(`  [build] assets copied (version: ${version})`);
