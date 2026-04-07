import { describe, expect, it } from 'vitest';
import { app } from '../src/app';
import {
  API_DOCS_PATH,
  OPENAPI_DOCUMENT_PATH
} from '../src/openapi/document';

describe('OpenAPI docs', () => {
  it('serves an OpenAPI JSON document for the documented core routes', async () => {
    const response = await app.request(OPENAPI_DOCUMENT_PATH, {
      method: 'GET'
    });

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      openapi: string;
      info: { title: string };
      paths: Record<
        string,
        {
          get?: { responses?: Record<string, unknown> };
          post?: { responses?: Record<string, unknown> };
          put?: { responses?: Record<string, unknown> };
        }
      >;
      components: {
        securitySchemes: Record<string, unknown>;
        schemas: Record<string, unknown>;
      };
    };

    expect(payload.openapi).toBe('3.0.3');
    expect(payload.info.title).toContain('API');
    expect(payload.paths['/health']).toBeDefined();
    expect(payload.paths['/auth/web/login']).toBeDefined();
    expect(payload.paths['/auth/web/refresh']).toBeDefined();
    expect(payload.paths['/users/me/profile']).toBeDefined();
    expect(payload.paths['/brand-applications']).toBeDefined();
    expect(payload.paths['/aircraft-submissions']).toBeDefined();
    expect(payload.paths['/content-categories']).toBeDefined();
    expect(payload.paths['/admin/categories']).toBeDefined();
    expect(payload.paths['/admin/brands']).toBeDefined();
    expect(payload.paths['/admin/site-settings']).toBeDefined();
    expect(payload.paths['/admin/analytics/overview']).toBeDefined();
    expect(payload.paths['/admin/reports/{kind}/{id}']).toBeDefined();
    expect(payload.paths['/models']).toBeDefined();
    expect(payload.paths['/models/{slug}/comments']).toBeDefined();
    expect(payload.paths['/models/{slug}/comments/{commentId}']).toBeDefined();
    expect(payload.paths['/admin/models']).toBeDefined();
    expect(payload.paths['/admin/models/{id}']).toBeDefined();
    expect(payload.paths['/home/feed']).toBeDefined();
    expect(payload.paths['/circle/feed']).toBeDefined();
    expect(payload.paths['/admin/posts/{id}']).toBeDefined();
    expect(payload.paths['/admin/official-articles/{id}']).toBeDefined();
    expect(payload.paths['/admin/rankings']).toBeDefined();
    expect(payload.paths['/admin/rankings/{id}/status']).toBeDefined();
    expect(payload.paths['/rating-targets/{id}']).toBeDefined();
    expect(payload.paths['/rating-targets/{itemId}/comments/{commentId}']).toBeDefined();
    expect(payload.paths['/reviews/{reviewId}/comments']).toBeDefined();
    expect(payload.paths['/reviews/{reviewId}/comments/{commentId}']).toBeDefined();
    expect(payload.paths['/auth/admin/logout']).toBeDefined();
    expect(payload.paths['/auth/admin/password/change']).toBeDefined();
    expect(payload.paths['/auth/protected/ping']).toBeDefined();
    expect(payload.components.securitySchemes.sessionCookieAuth).toBeDefined();
    expect(payload.components.securitySchemes.bearerAuth).toBeDefined();
    expect(payload.components.schemas.CurrentUserProfileResponse).toBeDefined();
    expect(payload.components.schemas.BrandApplicationResponse).toBeDefined();
    expect(payload.components.schemas.AircraftSubmissionResponse).toBeDefined();
    expect(payload.components.schemas.AdminAnalyticsOverviewResponse).toBeDefined();
    expect(payload.components.schemas.AdminReportRecordsResponse).toBeDefined();
    expect(payload.components.schemas.AdminPasswordChangeRequest).toBeDefined();
    expect(payload.paths['/users/me/profile']?.put?.responses?.['409']).toBeDefined();
    expect(
      payload.paths['/users/me/phone/change/request']?.post?.responses?.['409']
    ).toBeDefined();
    expect(
      payload.paths['/users/me/phone/change/confirm']?.post?.responses?.['409']
    ).toBeDefined();
    expect(payload.paths['/auth/web/refresh']?.post?.responses?.['401']).toBeDefined();
    expect(payload.paths['/auth/protected/ping']?.get?.responses?.['401']).toBeDefined();
    expect(payload.paths['/admin/rankings/{id}/status']?.put?.responses?.['403']).toBeDefined();
    expect(payload.paths['/auth/device/register']?.post).toBeDefined();
    expect(payload.paths['/auth/device/unregister']?.post).toBeDefined();
    expect(payload.components.schemas.DeviceRegisterRequest).toBeDefined();
    expect(payload.components.schemas.DeviceRegisterResponse).toBeDefined();
    expect(payload.components.schemas.DeviceUnregisterRequest).toBeDefined();
    expect(payload.components.schemas.PaginationQuery).toBeDefined();
    expect(payload.components.schemas.PaginationMeta).toBeDefined();
    const appLoginOperation = payload.paths['/auth/app/login']?.post as
      | { requestBody?: { description?: string } }
      | undefined;

    const appLoginSchema = payload.components.schemas.AppLoginRequest as {
      properties?: Record<string, { enum?: string[] }>;
    };
    const completeAppRegistrationSchema = payload.components.schemas
      .CompleteAppRegistrationRequest as {
      properties?: Record<string, { enum?: string[] }>;
    };
    const deviceRegisterSchema = payload.components.schemas.DeviceRegisterRequest as {
      properties?: Record<string, { enum?: string[] }>;
    };

    expect(appLoginSchema.properties?.deviceType?.enum).toEqual([
      'ios',
      'android',
      'harmony',
      'miniapp-wechat',
      'web'
    ]);
    expect(completeAppRegistrationSchema.properties?.deviceType?.enum).toEqual([
      'ios',
      'android',
      'harmony',
      'miniapp-wechat',
      'web'
    ]);
    expect(deviceRegisterSchema.properties?.deviceType?.enum).toEqual([
      'ios',
      'android',
      'harmony',
      'miniapp-wechat',
      'web'
    ]);
    expect(appLoginOperation?.requestBody?.description).toContain(
      'miniapp-wechat/web'
    );
  });

  it('serves Swagger UI that points to the OpenAPI JSON route', async () => {
    const response = await app.request(API_DOCS_PATH, {
      method: 'GET'
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');

    const payload = await response.text();

    expect(payload).toContain(OPENAPI_DOCUMENT_PATH);
    expect(payload).toContain('SwaggerUIBundle');
  });
});
