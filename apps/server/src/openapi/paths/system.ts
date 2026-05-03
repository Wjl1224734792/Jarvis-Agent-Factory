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
} as const;
