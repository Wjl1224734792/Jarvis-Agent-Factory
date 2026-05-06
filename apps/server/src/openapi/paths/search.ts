import { API_ROUTES } from '@feijia/shared';

import { jsonResponse, stringQueryParameter } from '../builders';
import {
  adminSessionSecurity,
  optionalSessionOrBearerSecurity
} from '../security';

export const searchPaths = {
  [API_ROUTES.search.site]: {
    get: {
      tags: ['search'],
      summary: '站点全局搜索',
      security: optionalSessionOrBearerSecurity,
      parameters: [
        stringQueryParameter('q', '搜索关键词。'),
        stringQueryParameter('limit', '返回条数上限，默认 24。')
      ],
      responses: {
        '200': jsonResponse('SiteSearchResponse', '返回站点搜索结果列表。')
      }
    }
  },
  [API_ROUTES.search.admin]: {
    get: {
      tags: ['search'],
      summary: '管理端全局搜索',
      security: adminSessionSecurity,
      parameters: [
        stringQueryParameter('q', '搜索关键词。'),
        stringQueryParameter('limit', '返回条数上限，默认 24。')
      ],
      responses: {
        '200': jsonResponse(
          'AdminSearchResponse',
          '返回管理端搜索结果列表。'
        ),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '当前无管理员权限。')
      }
    }
  }
} as const;
