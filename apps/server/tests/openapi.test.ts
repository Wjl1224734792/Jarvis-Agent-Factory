import { describe, expect, it } from 'vitest';
import { withApiV1Prefix } from '@feijia/shared';
import { app } from '../src/app';
import {
  API_DOCS_PATH,
  OPENAPI_DOCUMENT_PATH
} from '../src/openapi/document';

const v1Path = withApiV1Prefix;

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
    expect(payload.paths[v1Path('/auth/web/login')]).toBeDefined();
    expect(payload.paths[v1Path('/auth/web/refresh')]).toBeDefined();
    expect(payload.paths[v1Path('/auth/web/password/change')]).toBeDefined();
    expect(payload.paths[v1Path('/users/me/profile')]).toBeDefined();
    expect(payload.paths[v1Path('/brand-applications')]).toBeDefined();
    expect(payload.paths[v1Path('/aircraft-submissions')]).toBeDefined();
    expect(payload.paths[v1Path('/aircraft-submissions/{id}')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/aircraft-submissions/{id}')]).toBeDefined();
    expect(payload.paths[v1Path('/content-categories')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/categories')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/brands')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/site-settings')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/analytics/overview')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/reports/{kind}/{id}')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/users')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/users/{id}')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/users/{id}/ban')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/users/{id}/unban')]).toBeDefined();
    expect(payload.paths[v1Path('/models')]).toBeDefined();
    expect(payload.paths[v1Path('/models/{slug}/comments')]).toBeDefined();
    expect(payload.paths[v1Path('/models/{slug}/comments/{commentId}')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/models')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/models/{id}')]).toBeDefined();
    expect(payload.paths[v1Path('/home/feed')]).toBeDefined();
    expect(payload.paths[v1Path('/circle/feed')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/posts/{id}')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/official-articles/{id}')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/rankings')]).toBeDefined();
    expect(payload.paths[v1Path('/admin/rankings/{id}/status')]).toBeDefined();
    expect(payload.paths[v1Path('/rating-targets/{id}')]).toBeDefined();
    expect(payload.paths[v1Path('/rating-targets/{itemId}/comments/{commentId}')]).toBeDefined();
    expect(payload.paths[v1Path('/reviews/{reviewId}/comments')]).toBeDefined();
    expect(payload.paths[v1Path('/reviews/{reviewId}/comments/{commentId}')]).toBeDefined();
    expect(payload.paths[v1Path('/auth/admin/logout')]).toBeDefined();
    expect(payload.paths[v1Path('/auth/admin/password/change')]).toBeDefined();
    expect(payload.paths[v1Path('/auth/protected/ping')]).toBeDefined();
    expect(payload.components.securitySchemes.sessionCookieAuth).toBeDefined();
    expect(payload.components.securitySchemes.bearerAuth).toBeDefined();
    expect(payload.components.schemas.CurrentUserProfileResponse).toBeDefined();
    expect(payload.components.schemas.BrandApplicationResponse).toBeDefined();
    expect(payload.components.schemas.AircraftSubmissionResponse).toBeDefined();
    expect(payload.components.schemas.AdminAnalyticsOverviewResponse).toBeDefined();
    expect(payload.components.schemas.AdminReportRecordsResponse).toBeDefined();
    expect(payload.components.schemas.AdminUsersResponse).toBeDefined();
    expect(payload.components.schemas.AdminUserResponse).toBeDefined();
    expect(payload.components.schemas.AdminBanUserRequest).toBeDefined();
    expect(payload.components.schemas.AdminPasswordChangeRequest).toBeDefined();
    expect(payload.components.schemas.UserPasswordChangeRequest).toBeDefined();
    expect(payload.paths[v1Path('/users/me/profile')]?.put?.responses?.['409']).toBeDefined();
    expect(
      payload.paths[v1Path('/users/me/phone/change/request')]?.post?.responses?.['409']
    ).toBeDefined();
    expect(
      payload.paths[v1Path('/users/me/phone/change/request')]?.post?.responses?.['403']
    ).toBeDefined();
    expect(
      payload.paths[v1Path('/users/me/phone/change/confirm')]?.post?.responses?.['409']
    ).toBeDefined();
    expect(
      payload.paths[v1Path('/users/me/phone/change/confirm')]?.post?.responses?.['403']
    ).toBeDefined();
    expect(payload.paths[v1Path('/auth/web/refresh')]?.post?.responses?.['401']).toBeDefined();
    expect(
      payload.paths[v1Path('/auth/web/password/change')]?.post?.responses?.['401']
    ).toBeDefined();
    expect(
      payload.paths[v1Path('/auth/web/password/change')]?.post?.responses?.['403']
    ).toBeDefined();
    expect(payload.paths[v1Path('/auth/protected/ping')]?.get?.responses?.['401']).toBeDefined();
    expect(payload.paths[v1Path('/admin/users/{id}/ban')]?.post?.responses?.['400']).toBeDefined();
    expect(payload.paths[v1Path('/admin/rankings/{id}/status')]?.put?.responses?.['403']).toBeDefined();
    expect(payload.paths[v1Path('/auth/device/register')]?.post).toBeDefined();
    expect(payload.paths[v1Path('/auth/device/unregister')]?.post).toBeDefined();
    expect(payload.components.schemas.DeviceRegisterRequest).toBeDefined();
    expect(payload.components.schemas.DeviceRegisterResponse).toBeDefined();
    expect(payload.components.schemas.DeviceUnregisterRequest).toBeDefined();
    expect(payload.components.schemas.PaginationQuery).toBeDefined();
    expect(payload.components.schemas.PaginationMeta).toBeDefined();
    const appLoginOperation = payload.paths[v1Path('/auth/app/login')]?.post as
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
