import { API_ROUTES } from '@feijia/shared';

import {
  jsonResponse,
  stringPathParameter
} from '../builders';

import { adminSessionSecurity } from '../security';

export const adminReportsPaths = {
    [API_ROUTES.admin.reportDetail('{kind}', '{id}')]: {
      get: {
        tags: ['admin-reports'],
        summary: '获取举报明细',
        security: adminSessionSecurity,
        parameters: [
          {
            name: 'kind',
            in: 'path',
            required: true,
            description: '举报目标类型。',
            schema: {
              type: 'string',
              enum: [
                'post',
                'model',
                'review',
                'post-comment',
                'review-comment',
                'model-comment',
                'ranking',
                'rating-target',
                'ranking-comment',
                'rating-target-comment'
              ]
            }
          },
          stringPathParameter('id', '举报目标 ID。')
        ],
        responses: {
          '200': jsonResponse(
            'AdminReportRecordsResponse',
            '返回该目标下的举报记录与证据。'
          ),
          '400': jsonResponse('ErrorResponse', '举报类型或目标 ID 不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
} as const;
