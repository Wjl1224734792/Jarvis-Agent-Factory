import { API_ROUTES } from '@feijia/shared';

import { jsonResponse } from '../builders';

export const systemPaths = {
    [API_ROUTES.health]: {
      get: {
        tags: ['system'],
        summary: '健康检查',
        description: '返回服务状态、时间戳与版本号，供探活与联调使用。',
        responses: {
          '200': jsonResponse('HealthResponse', '服务可用。')
        }
      }
    },
    [API_ROUTES.linkPreview]: {
      get: {
        tags: ['system'],
        summary: '解析链接预览',
        description: '解析平台内部链接（飞行器、文章、飞友圈），返回标题、描述、封面图用于生成链接卡片。',
        parameters: [
          { name: 'url', in: 'query', required: true, schema: { type: 'string' }, description: '待解析的链接 URL' }
        ],
        responses: {
          '200': { description: '返回链接预览信息（标题、描述、封面图 URL、类型）。' },
          '400': jsonResponse('ErrorResponse', '链接不合法或非平台内部链接。')
        }
      }
    },
} as const;
