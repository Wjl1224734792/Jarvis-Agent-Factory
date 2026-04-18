export const openApiSecuritySchemes = {
  sessionCookieAuth: {
    type: 'apiKey',
    in: 'cookie',
    name: 'feijia_access',
    description: 'Web 与管理端通过会话 Cookie 访问的鉴权方式。'
  },
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Session Token',
    description: 'App 端通过 Authorization: Bearer <token> 访问的鉴权方式。'
  }
} as const;

export const _sessionCookieSecurity = [{ sessionCookieAuth: [] }] as const;
export const optionalSessionCookieSecurity = [{}, { sessionCookieAuth: [] }] as const;
export const optionalBearerSecurity = [{}, { bearerAuth: [] }] as const;
export const optionalSessionOrBearerSecurity = [
  {},
  { sessionCookieAuth: [] },
  { bearerAuth: [] }
] as const;
export const sessionOrBearerSecurity = [
  { sessionCookieAuth: [] },
  { bearerAuth: [] }
] as const;
export const adminSessionSecurity = [{ sessionCookieAuth: [] }] as const;
