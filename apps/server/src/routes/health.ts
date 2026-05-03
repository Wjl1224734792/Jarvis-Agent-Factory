import { healthResponseSchema } from '@feijia/schemas';
import { Hono } from 'hono';

export const healthRoute = new Hono().get("/", (context) => {
  // 健康检查始终返回共享 schema，保证 server、测试和文档引用同一份结构。
  const payload = healthResponseSchema.parse({
    status: 'ok',
    service: 'server',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });

  return context.json(payload);
});
