import { API_ROUTES } from '@feijia/shared';

import { jsonRequestBody, jsonResponse, stringPathParameter } from '../builders';
import { adminSessionSecurity } from '../security';

export const powerTypePaths = {
  [API_ROUTES.powerTypes.list]: {
    get: {
      tags: ['power-types'],
      summary: '获取动力分类列表',
      responses: {
        '200': jsonResponse('PowerTypeListResponse', '返回动力分类列表。')
      }
    }
  },
  [API_ROUTES.powerTypes.adminList]: {
    get: {
      tags: ['power-types'],
      summary: '管理端获取动力分类列表',
      security: adminSessionSecurity,
      responses: {
        '200': jsonResponse(
          'PowerTypeListResponse',
          '返回动力分类列表。'
        ),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '非管理员会话。')
      }
    },
    post: {
      tags: ['power-types'],
      summary: '新增动力分类',
      security: adminSessionSecurity,
      requestBody: jsonRequestBody(
        'AdminPowerTypeCategoryRequest',
        '提交动力分类 slug、名称和排序。'
      ),
      responses: {
        '200': jsonResponse(
          'AdminPowerTypeCategoryResponse',
          '动力分类创建成功。'
        ),
        '400': jsonResponse('ErrorResponse', '参数错误。'),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '非管理员会话。'),
        '500': jsonResponse('ErrorResponse', '创建失败。')
      }
    }
  },
  [API_ROUTES.powerTypes.adminDetail('{id}')]: {
    put: {
      tags: ['power-types'],
      summary: '更新动力分类',
      security: adminSessionSecurity,
      parameters: [stringPathParameter('id', '动力分类 ID。')],
      requestBody: jsonRequestBody(
        'AdminPowerTypeCategoryRequest',
        '提交动力分类 slug、名称和排序。'
      ),
      responses: {
        '200': jsonResponse(
          'AdminPowerTypeCategoryResponse',
          '动力分类已更新。'
        ),
        '400': jsonResponse('ErrorResponse', '缺少动力分类 ID。'),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '非管理员会话。'),
        '404': jsonResponse('ErrorResponse', '动力分类不存在。')
      }
    }
  }
} as const;
