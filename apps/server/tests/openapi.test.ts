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
      paths: Record<string, unknown>;
      components: {
        securitySchemes: Record<string, unknown>;
      };
    };

    expect(payload.openapi).toBe('3.0.3');
    expect(payload.info.title).toContain('API');
    expect(payload.paths['/health']).toBeDefined();
    expect(payload.paths['/auth/web/login']).toBeDefined();
    expect(payload.paths['/models']).toBeDefined();
    expect(payload.components.securitySchemes.sessionCookieAuth).toBeDefined();
    expect(payload.components.securitySchemes.bearerAuth).toBeDefined();
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
