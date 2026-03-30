import { swaggerUI } from '@hono/swagger-ui';
import { APP_NAME, API_ROUTES, APP_PORTS, APP_ROUTES } from '@feijia/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { adminAnalyticsRoute } from './modules/admin-analytics/admin-analytics.route';
import { adminReportsRoute } from './modules/admin-reports/admin-reports.route';
import { aircraftModelsRoute } from './modules/aircraft-models/aircraft-models.route';
import { aircraftSubmissionsRoute } from './modules/aircraft-submissions/aircraft-submissions.route';
import { authRoute } from './modules/auth/auth.route';
import { brandApplicationsRoute } from './modules/brand-applications/brand-applications.route';
import { brandsRoute } from './modules/brands/brands.route';
import { categoriesRoute } from './modules/categories/categories.route';
import { contentCategoriesRoute } from './modules/content-categories/content-categories.route';
import { postsRoute } from './modules/posts/posts.route';
import { rankingsRoute } from './modules/rankings/rankings.route';
import { reviewsRoute } from './modules/reviews/reviews.route';
import { siteSettingsRoute } from './modules/site-settings/site-settings.route';
import { socialRoute } from './modules/social/social.route';
import { uploadsRoute } from './modules/uploads/upload.route';
import { ensureServerEnvLoaded } from './lib/load-env';
import { logger } from './lib/logger';
import {
  API_DOCS_PATH,
  OPENAPI_DOCUMENT_PATH,
  openApiDocument
} from './openapi/document';
import { healthRoute } from './routes/health';

ensureServerEnvLoaded();

export const app = new Hono();

const defaultCorsOrigins = [
  `http://localhost:${APP_PORTS.web}`,
  `http://localhost:${APP_PORTS.admin}`
] as const;

/**
 * 解析 CORS 允许的源。
 *
 * - 未设置 `CORS_ORIGIN` / `CORS_ORIGINS`：仅允许本地 web / admin（`APP_PORTS`）。
 * - 值为 `*` 或 `all`：允许任意浏览器来源；因启用了 `credentials: true`，不能使用
 *   `Access-Control-Allow-Origin: *`，改为**回显请求中的 `Origin`**（与「全部允许」等价）。
 * - 其它：按逗号分隔的绝对源列表，例如 `https://a.com,https://b.com`。
 *
 * @returns `cors()` 的 `origin` 选项
 */
function resolveCorsOrigin():
  | string[]
  | ((origin: string) => string | undefined | null) {
  const raw = process.env.CORS_ORIGIN?.trim() ?? process.env.CORS_ORIGINS?.trim();
  if (raw === '*' || raw?.toLowerCase() === 'all') {
    return (origin: string) => origin;
  }
  if (raw) {
    const list = raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (list.length > 0) {
      return list;
    }
  }
  return [...defaultCorsOrigins];
}

app.use(
  '*',
  cors({
    origin: resolveCorsOrigin(),
    credentials: true
  })
);

const shouldLogHttp =
  process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';

if (shouldLogHttp) {
  // 把请求日志保持在 app 聚合层，便于所有模块共享同一套请求埋点口径。
  app.use('*', async (c, next) => {
    const started = performance.now();
    await next();
    const ms = Math.round(performance.now() - started);
    logger.info(`${c.req.method} ${c.req.path}`, {
      status: c.res.status,
      ms
    });
  });
}

// 文档入口和 JSON 规范都挂在应用聚合层，避免把“文档能力”散落进各业务路由。
app.get(OPENAPI_DOCUMENT_PATH, (context) => context.json(openApiDocument));
app.get(
  API_DOCS_PATH,
  swaggerUI({
    title: `${APP_NAME} API Docs`,
    url: OPENAPI_DOCUMENT_PATH,
    persistAuthorization: true
  })
);

app.get('/', (c) =>
  c.json({
    message: 'feijia server is running'
  })
);

// 先挂轻量基础入口，再按模块装配业务路由，便于探活、文档和错误处理保持稳定。
app.route(APP_ROUTES.health, healthRoute);
app.route('/', authRoute);
app.route('/', uploadsRoute);
app.route('/', postsRoute);
app.route('/', socialRoute);
app.route('/', adminAnalyticsRoute);
app.route('/', adminReportsRoute);
app.route('/', rankingsRoute);
app.route('/', aircraftModelsRoute);
app.route('/', aircraftSubmissionsRoute);
app.route('/', brandApplicationsRoute);
app.route('/', reviewsRoute);
app.route('/', siteSettingsRoute);
app.route(API_ROUTES.models.categories, categoriesRoute);
app.route(API_ROUTES.models.brands, brandsRoute);
app.route('/', contentCategoriesRoute);

app.notFound((context) =>
  context.json(
    {
      code: 'NOT_FOUND',
      message: 'Route not found.'
    },
    404
  )
);

app.onError((error, context) => {
  // 先把 schema 校验类错误统一映射成 400，再兜底成 500，避免业务路由重复处理相同分支。
  const maybeValidationError = error as { issues?: Array<{ message?: string }> };
  if (Array.isArray(maybeValidationError.issues)) {
    logger.error(error.message, {
      stack: error.stack,
      path: context.req.path,
      method: context.req.method
    });

    return context.json(
      {
        code: 'BAD_REQUEST',
        message: maybeValidationError.issues[0]?.message ?? 'Invalid request.'
      },
      400
    );
  }

  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(err.message, {
    stack: err.stack,
    path: context.req.path,
    method: context.req.method
  });

  return context.json(
    {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error.'
    },
    500
  );
});
