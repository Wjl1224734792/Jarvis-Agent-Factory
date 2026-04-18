import { API_ROUTES } from '@feijia/shared';

import {
  jsonRequestBody,
  jsonResponse
} from '../builders';

import { adminSessionSecurity } from '../security';

export const settingsPaths = {
    [API_ROUTES.admin.siteSettings]: {
      get: {
        tags: ['settings'],
        summary: '查看站点设置',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse(
            'SiteSettingsResponse',
            '返回当前站点设置。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      },
      put: {
        tags: ['settings'],
        summary: '更新站点设置',
        security: adminSessionSecurity,
        requestBody: jsonRequestBody(
          'UpdateSiteSettingsRequest',
          '按需更新站点设置，至少提交一个字段。'
        ),
        responses: {
          '200': jsonResponse(
            'SiteSettingsResponse',
            '站点设置已更新。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '500': jsonResponse('ErrorResponse', '站点设置更新失败。')
        }
      }
    },
} as const;
