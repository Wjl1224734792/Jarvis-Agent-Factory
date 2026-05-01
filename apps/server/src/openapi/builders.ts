import { z } from 'zod';

export type JsonSchemaObject = Record<string, unknown>;

/**
 * 将 Zod schema 转换为 OpenAPI 3.0 JSON Schema。
 *
 * @param schema 需要导出的 Zod schema。
 * @returns 可直接放入 OpenAPI 文档的 JSON Schema 对象。
 * @throws {Error} 当 Zod 导出 schema 失败时会继续向上抛出异常。
 */
export function toOpenApiSchema(schema: z.ZodTypeAny): JsonSchemaObject {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0'
  }) as JsonSchemaObject;
}

/**
 * 合并基础 schema 与额外的 OpenAPI 字段。
 *
 * @param schema 基础 JSON Schema。
 * @param extra 需要覆盖或补充的字段。
 * @returns 合并后的 schema 对象。
 * @throws {never} 该函数只做对象展开合并，不会主动抛出异常。
 */
export function mergeSchema(
  schema: JsonSchemaObject,
  extra: Record<string, unknown>
): JsonSchemaObject {
  return {
    ...schema,
    ...extra
  };
}

/**
 * 构建组件 schema 的 `$ref` 引用。
 *
 * @param name 组件 schema 名称。
 * @returns 指向 `#/components/schemas/*` 的引用对象。
 * @throws {never} 该函数只拼接字符串，不会主动抛出异常。
 */
export function schemaRef(name: string) {
  return {
    $ref: `#/components/schemas/${name}`
  };
}

/**
 * 构建 JSON 请求体定义。
 *
 * @param schemaName 引用的 schema 名称。
 * @param description 请求体说明。
 * @param required 是否必填，默认 `true`。
 * @returns OpenAPI requestBody 配置对象。
 * @throws {never} 该函数只组装字面量对象，不会主动抛出异常。
 */
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

/**
 * 构建 JSON 响应体定义。
 *
 * @param schemaName 引用的 schema 名称。
 * @param description 响应说明。
 * @returns OpenAPI response 配置对象。
 * @throws {never} 该函数只组装字面量对象，不会主动抛出异常。
 */
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

/**
 * 构建字符串类型的 path 参数定义。
 *
 * @param name 参数名。
 * @param description 参数说明。
 * @returns OpenAPI parameter 配置对象。
 * @throws {never} 该函数只组装字面量对象，不会主动抛出异常。
 */
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

/**
 * 构建字符串类型的 query 参数定义。
 *
 * @param name 参数名。
 * @param description 参数说明。
 * @returns OpenAPI parameter 配置对象。
 * @throws {never} 该函数只组装字面量对象，不会主动抛出异常。
 */
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
