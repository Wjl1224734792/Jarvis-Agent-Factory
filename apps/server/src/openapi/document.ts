import { componentSchemas } from './components';
import { openApiInfo, openApiServers, openApiTags } from './info';
import { openApiPaths } from './paths';
import { openApiSecuritySchemes } from './security';

export const OPENAPI_DOCUMENT_PATH = '/openapi.json';
export const API_DOCS_PATH = '/docs';

export const openApiDocument = {
  openapi: '3.0.3',
  info: openApiInfo,
  servers: openApiServers,
  tags: openApiTags,
  components: {
    securitySchemes: openApiSecuritySchemes,
    schemas: componentSchemas
  },
  paths: openApiPaths
} as const;
