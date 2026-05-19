import { swaggerUI } from '@hono/swagger-ui';
import { APP_NAME, API_ROUTES, APP_ROUTES } from '@feijia/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { adminAnalyticsRoute } from './modules/admin-analytics/admin-analytics.route';
import { adminLogsRoute } from './modules/admin-logs/admin-logs.route';
import { adminReportsRoute } from './modules/admin-reports/admin-reports.route';
import { aircraftModelsRoute } from './modules/aircraft-models/aircraft-models.route';
import { aircraftSubmissionsRoute } from './modules/aircraft-submissions/aircraft-submissions.route';
import { circlesRoute } from './modules/circles/circles.route';
import { auditsRoute } from './modules/audits/audits.route';
import { authRoute } from './modules/auth/auth.route';
import { resolveAuthCodeConfig } from './modules/auth/auth.repo';
import { resolveSmsProviderConfig } from './modules/auth/sms-provider';
import { brandApplicationsRoute } from './modules/brand-applications/brand-applications.route';
import { brandsRoute } from './modules/brands/brands.route';
import { categoriesRoute } from './modules/categories/categories.route';
import { contentCategoriesRoute } from './modules/content-categories/content-categories.route';
import { powerTypesRoute } from './modules/power-types/power-types.route';
import { postsRoute } from './modules/posts/posts.route';
import { rankingsRoute } from './modules/rankings/rankings.route';
import { reviewsRoute } from './modules/reviews/reviews.route';
import { searchRoute } from './modules/search/search.route';
import { siteSettingsRoute } from './modules/site-settings/site-settings.route';
import { socialRoute } from './modules/social/social.route';
import { uploadsRoute } from './modules/uploads/upload.route';
import { usersRoute } from './modules/users/users.route';
import { aiRoute } from './modules/ai/ai.route';
import { buildDefaultCorsOrigins, isAllowedDevCorsOrigin } from './lib/cors-origins';
import { parseOptionalBooleanEnv } from './lib/env-flags';
import { ensureServerEnvLoaded } from './lib/load-env';
import { logger } from './lib/logger';
import {
  getRequestFileLookupCount,
  isApiMetricsEnabled,
  runWithRequestMetrics
} from './lib/request-metrics';
import {
  API_DOCS_PATH,
  OPENAPI_DOCUMENT_PATH,
  openApiDocument
} from './openapi/document';
import { healthRoute } from './routes/health';

ensureServerEnvLoaded();
resolveAuthCodeConfig();
resolveSmsProviderConfig();

export const app = new Hono();

function parseConfiguredCorsOrigins(raw: string | undefined) {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

/**
 * 解析服务端实际使用的 CORS 来源配置。
 *
 * @returns 显式白名单数组，或用于动态放行开发来源的回调函数。
 * @throws {Error} 当生产环境显式配置 `CORS_ORIGIN=*` 时抛出异常。
 */
export function resolveCorsOrigin():
  | string[]
  | ((origin: string) => string | undefined | null) {
  const raw = process.env.CORS_ORIGIN?.trim() ?? process.env.CORS_ORIGINS?.trim();
  if (raw === '*') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CORS_ORIGIN=* is forbidden in production when credentials are enabled.'
      );
    }

    return (origin: string) => origin;
  }

  if (raw) {
    const list = parseConfiguredCorsOrigins(raw);
    if (list.length > 0) {
      return list;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return (origin: string) =>
      isAllowedDevCorsOrigin(origin) ? origin : undefined;
  }

  return [...buildDefaultCorsOrigins()];
}

/**
 * 解析 OpenAPI 文档暴露开关。
 *
 * @returns 显式配置优先；未配置时非生产默认开启、生产默认关闭。
 * @throws {never} 该函数只读取环境变量，不会主动抛出异常。
 */
function resolveOpenApiEnabled() {
  const configured = parseOptionalBooleanEnv(process.env.OPENAPI_ENABLED);
  if (configured !== undefined) {
    return configured;
  }

  return process.env.NODE_ENV !== 'production';
}

app.use(
  '*',
  cors({
    // CORS 在应用层统一处理，业务路由不再分别维护跨域规则。
    origin: resolveCorsOrigin(),
    credentials: true
  })
);

const shouldLogHttp =
  process.env.NODE_ENV !== 'test' &&
  parseOptionalBooleanEnv(process.env.LOG_HTTP_ENABLED) !== false;
const shouldLogApiMetrics =
  process.env.NODE_ENV !== 'test' && isApiMetricsEnabled();
const monitoredMetricsPaths = new Set<string>([
  API_ROUTES.feed,
  API_ROUTES.models.list,
  API_ROUTES.rankings.overview
]);

function parseResponseContentLength(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function isJsonRequestParseError(error: unknown) {
  return (
    error instanceof SyntaxError &&
    /JSON|Unexpected|Expected property name/i.test(error.message)
  );
}

if (shouldLogHttp) {
  app.use('*', async (c, next) => {
    const started = performance.now();
    await runWithRequestMetrics(async () => {
      await next();
    });

    const ms = Math.round(performance.now() - started);
    logger.request(`${c.req.method} ${c.req.path}`, {
      status: c.res.status,
      ms
    });

    if (
      !shouldLogApiMetrics ||
      c.req.method !== 'GET' ||
      !monitoredMetricsPaths.has(c.req.path)
    ) {
      return;
    }

    let responseBytes = parseResponseContentLength(
      c.res.headers.get('content-length')
    );
    if (responseBytes === null) {
      try {
        const text = await c.res.clone().text();
        responseBytes = Buffer.byteLength(text, 'utf8');
      } catch {
        responseBytes = null;
      }
    }

    logger.info('api.performance.baseline', {
      path: c.req.path,
      method: c.req.method,
      status: c.res.status,
      ms,
      responseBytes,
      fileLookupCount: getRequestFileLookupCount()
    });
  });
}

if (resolveOpenApiEnabled()) {
  // OpenAPI JSON 与 Swagger UI 复用同一份文档生成结果。
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
app.route('/', auditsRoute);
app.route('/', uploadsRoute);
app.route('/', usersRoute);
app.route('/', postsRoute);
app.route('/', socialRoute);
app.route('/', searchRoute);
app.route('/', adminAnalyticsRoute);
app.route('/', adminLogsRoute);
app.route('/', adminReportsRoute);
app.route('/', rankingsRoute);
app.route('/', aircraftModelsRoute);
app.route('/', aircraftSubmissionsRoute);
app.route('/', brandApplicationsRoute);
app.route('/', reviewsRoute);
app.route('/', siteSettingsRoute);
app.route(API_ROUTES.models.categories, categoriesRoute);
app.route(API_ROUTES.models.brands, brandsRoute);
app.route('/', powerTypesRoute);
app.route('/', contentCategoriesRoute);
app.route('/', aiRoute);
app.route('/', circlesRoute);

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
  if (isJsonRequestParseError(error)) {
    return context.json(
      {
        code: 'BAD_REQUEST',
        message: 'Malformed JSON request body.'
      },
      400
    );
  }

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
