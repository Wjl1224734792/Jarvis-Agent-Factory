import {
  jsonRequestBody,
  jsonResponse
} from '../builders';

import {
  sessionOrBearerSecurity,
  adminSessionSecurity
} from '../security';

/** AI 模块 API 路径前缀，与 API_ROUTES.ai 对齐 */
const AI_PREFIX = '/api/v1/ai';
const ADMIN_AI_PREFIX = '/api/v1/admin/ai';

export const aiPaths = {
    [`${AI_PREFIX}/summary`]: {
      post: {
        tags: ['AI'],
        summary: 'AI 摘要生成',
        description:
          '为指定文章生成 150-300 字的中文摘要。支持 Redis 缓存，缓存命中时不重复调用 AI。',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'AiSummaryRequest',
          '提交文章 ID 和可选的自定义内容。'
        ),
        responses: {
          '200': jsonResponse(
            'AiSummaryResponse',
            '摘要生成成功，返回摘要文本和是否命中缓存。'
          ),
          '400': jsonResponse(
            'ErrorResponse',
            '文章不存在或当前用户无权限生成摘要。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', 'AI 摘要功能已关闭。'),
          '429': jsonResponse(
            'ErrorResponse',
            '请求频率超限，每篇文章每 24 小时仅允许重新生成一次。'
          ),
          '500': jsonResponse('ErrorResponse', '服务内部错误。'),
          '502': jsonResponse(
            'ErrorResponse',
            'AI 服务暂时不可用，请稍后重试。'
          )
        }
      }
    },
    [`${AI_PREFIX}/format`]: {
      post: {
        tags: ['AI'],
        summary: 'AI 辅助排版',
        description:
          '对提交的 HTML 内容进行 AI 排版。支持 beautify（局部美化）和 structure（全文结构化）两种模式。',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'AiFormatRequest',
          '提交原始 HTML 内容和排版模式。'
        ),
        responses: {
          '200': jsonResponse(
            'AiFormatResponse',
            '排版成功，返回格式化后的 HTML 和变更说明。'
          ),
          '400': jsonResponse(
            'ErrorResponse',
            '内容超过 8000 字符限制或参数不合法。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', 'AI 排版功能已关闭。'),
          '500': jsonResponse('ErrorResponse', '服务内部错误。'),
          '502': jsonResponse(
            'ErrorResponse',
            'AI 服务暂时不可用，请稍后重试。'
          )
        }
      }
    },
    [`${ADMIN_AI_PREFIX}/settings`]: {
      get: {
        tags: ['AI'],
        summary: '获取 AI 配置',
        description:
          '获取管理后台 AI 服务配置，API Key 以脱敏形式返回。',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse(
            'AiSettingsResponse',
            '返回当前 AI 配置，API Key 已脱敏。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      },
      put: {
        tags: ['AI'],
        summary: '更新 AI 配置',
        description:
          '更新管理后台 AI 服务配置，保存后即时生效。',
        security: adminSessionSecurity,
        requestBody: jsonRequestBody(
          'UpdateAiSettingsRequest',
          '提交 AI 服务配置，至少更新一个字段。'
        ),
        responses: {
          '200': jsonResponse(
            'AiSettingsResponse',
            'AI 配置更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '配置参数不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '500': jsonResponse('ErrorResponse', 'AI 配置更新失败。')
        }
      }
    }
} as const;
