import { API_ROUTES } from '@feijia/shared';

import { jsonResponse } from '../builders';

import { adminSessionSecurity } from '../security';

export const adminAnalyticsPaths = {
    [API_ROUTES.admin.analyticsOverview]: {
      get: {
        tags: ['admin-analytics'],
        summary: '获取后台概览统计',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse(
            'AdminAnalyticsOverviewResponse',
            '返回注册、活跃、内容和审核概览。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
} as const;
