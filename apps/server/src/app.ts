import { swaggerUI } from '@hono/swagger-ui';
import { APP_NAME, API_ROUTES, APP_ROUTES } from '@feijia/shared';
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
import { searchRoute } from './modules/search/search.route';
import { siteSettingsRoute } from './modules/site-settings/site-settings.route';
import { socialRoute } from './modules/social/social.route';
import { uploadsRoute } from './modules/uploads/upload.route';
import { buildDefaultCorsOrigins } from './lib/cors-origins';
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

// 优先解析显式配置；未配置时退回开发期默认白名单，兼顾本地联调与生产收敛。
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
      .map(part => part.trim())
      .filter(part => part.length > 0);
    if (list.length > 0) {
      return list;
    }
  }

  return [...buildDefaultCorsOrigins()];
}

// 环境变量允许多种“真/假”写法，避免部署平台布尔值格式差异导致行为偏差。
function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

// OpenAPI 文档默认只在非生产暴露，生产环境必须显式开启。
function resolveOpenApiEnabled() {
  const configured = parseBooleanEnv(process.env.OPENAPI_ENABLED);
  if (configured !== undefined) {
    return configured;
  }

  return process.env.NODE_ENV !== 'production';
}

app.use(
  '*',
  cors({
    // CORS 在全局统一处理，后续业务路由不再单独维护跨域头。
    origin: resolveCorsOrigin(),
    credentials: true
  })
);

const shouldLogHttp =
  process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';

if (shouldLogHttp) {
  app.use('*', async (c, next) => {
    const started = performance.now();
    await next();
    // 仅在非生产输出简洁请求日志，方便本地排查接口耗时与状态码。
    const ms = Math.round(performance.now() - started);
    logger.info(`${c.req.method} ${c.req.path}`, {
      status: c.res.status,
      ms
    });
  });
}

if (resolveOpenApiEnabled()) {
  // OpenAPI JSON 与 Swagger UI 成对暴露，文档端始终基于同一份生成结果。
  app.get(OPENAPI_DOCUMENT_PATH, context => context.json(openApiDocument));
  app.get(
    API_DOCS_PATH,
    swaggerUI({
      title: `${APP_NAME} API Docs`,
      url: OPENAPI_DOCUMENT_PATH,
      persistAuthorization: true
    })
  );
}

app.get('/', c =>
  c.json({
    message: 'feijia server is running'
  })
);

app.route(APP_ROUTES.health, healthRoute);
app.route('/', authRoute);
app.route('/', uploadsRoute);
app.route('/', postsRoute);
app.route('/', socialRoute);
app.route('/', searchRoute);
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

// 404 与 500 统一走 JSON，保证前后台和移动端都能稳定消费错误结构。
app.notFound(context =>
  context.json(
    {
      code: 'NOT_FOUND',
      message: 'Route not found.'
    },
    404
  )
);

app.onError((error, context) => {
  const maybeValidationError = error as { issues?: Array<{ message?: string }> };
  if (Array.isArray(maybeValidationError.issues)) {
    // Zod/Hono 校验错误统一下沉成 400，避免把输入问题误报成服务器异常。
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
