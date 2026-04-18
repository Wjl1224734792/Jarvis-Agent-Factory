import { z } from 'zod';

export type JsonSchemaObject = Record<string, unknown>;

export function toOpenApiSchema(schema: z.ZodTypeAny): JsonSchemaObject {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0'
  }) as JsonSchemaObject;
}

export function mergeSchema(
  schema: JsonSchemaObject,
  extra: Record<string, unknown>
): JsonSchemaObject {
  return {
    ...schema,
    ...extra
  };
}

export function schemaRef(name: string) {
  return {
    $ref: `#/components/schemas/${name}`
  };
}

export function jsonRequestBody(
  schemaName: string,
  description: string,
  required = true
) {
  return {
    description,
    required,
    content: {
      'application/json': {
        schema: schemaRef(schemaName)
      }
    }
  };
}

export function jsonResponse(schemaName: string, description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: schemaRef(schemaName)
      }
    }
  };
}

export function stringPathParameter(name: string, description: string) {
  return {
    name,
    in: 'path',
    required: true,
    description,
    schema: {
      type: 'string'
    }
  };
}

export function stringQueryParameter(name: string, description: string) {
  return {
    name,
    in: 'query',
    required: false,
    description,
    schema: {
      type: 'string'
    }
  };
}
