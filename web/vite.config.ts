import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** 移除 type="module" 和 import.meta.url，让产物在 file:// 协议下也能直接打开 */
function fileProtocolCompat() {
  return {
    name: 'file-protocol-compat',
    enforce: 'post' as const,
    generateBundle(_options: any, bundle: any) {
      for (const [, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'asset' && (chunk.fileName ?? chunk.name ?? '').endsWith('.html')) {
          let html = (chunk as any).source as string;
          // inline type="module" 在 file:// 下的动态 import() 会被浏览器 CORS 拦截
          html = html.replace(/<script type="module" crossorigin>/g, '<script>');
          html = html.replace(/<script type="module">/g, '<script>');
          // import.meta.url 在非 module 脚本中是语法错误，替换为 location.href
          html = html.replace(/import\.meta\.url/g, '(typeof location!=="undefined"?location.href:".")');
          (chunk as any).source = html;
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true }), fileProtocolCompat()],
  base: '/',
  build: {
    outDir: resolve(__dirname, '..', 'dist', 'web'),
    emptyOutDir: true,
    // 单文件模式下关闭 CSS 代码分割，全部内联到 JS
    cssCodeSplit: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3456',
      '/health': 'http://127.0.0.1:3456',
    },
  },
});
