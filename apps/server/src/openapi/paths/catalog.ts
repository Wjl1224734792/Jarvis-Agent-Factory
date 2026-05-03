import { API_ROUTES } from '@feijia/shared';

import {
  jsonRequestBody,
  jsonResponse,
  stringPathParameter
} from '../builders';

import { adminSessionSecurity } from '../security';

export const catalogPaths = {
    [API_ROUTES.content.categories]: {
      get: {
        tags: ['catalog'],
        summary: '查看启用中的内容分类',
        responses: {
          '200': jsonResponse(
            'ContentCategoriesResponse',
            '返回可用于内容发布的分类列表。'
          )
        }
      }
    },
    [API_ROUTES.content.adminCategories]: {
      get: {
        tags: ['catalog'],
        summary: '管理端查看全部内容分类',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse(
            'ContentCategoriesResponse',
            '返回全部内容分类。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      },
      post: {
        tags: ['catalog'],
        summary: '管理端创建内容分类',
        security: adminSessionSecurity,
        requestBody: jsonRequestBody(
          'AdminContentCategoryRequest',
          '创建内容分类。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminContentCategoryResponse',
            '内容分类创建成功。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.content.adminCategoryDetail('{id}')]: {
      put: {
        tags: ['catalog'],
        summary: '管理端更新内容分类',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '内容分类 ID。')],
        requestBody: jsonRequestBody(
          'AdminContentCategoryRequest',
          '更新内容分类。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminContentCategoryResponse',
            '内容分类已更新。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少内容分类 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '内容分类不存在。')
        }
      }
    },
    [API_ROUTES.models.categories]: {
      get: {
        tags: ['catalog'],
        summary: '查看机型分类列表',
        responses: {
          '200': jsonResponse(
            'AircraftCategoryListResponse',
            '返回机型分类列表。'
          )
        }
      },
      post: {
        tags: ['catalog'],
        summary: '管理端创建机型分类',
        security: adminSessionSecurity,
        requestBody: jsonRequestBody(
          'AdminCategoryRequest',
          '创建机型分类。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminCategoryResponse',
            '机型分类创建成功。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.models.adminCategoryDetail('{id}')]: {
      put: {
        tags: ['catalog'],
        summary: '管理端更新机型分类',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '机型分类 ID。')],
        requestBody: jsonRequestBody(
          'AdminCategoryRequest',
          '更新机型分类。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminCategoryResponse',
            '机型分类已更新。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少机型分类 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '机型分类不存在。')
        }
      }
    },
    [API_ROUTES.models.brands]: {
      get: {
        tags: ['catalog'],
        summary: '查看品牌列表',
        responses: {
          '200': jsonResponse('BrandListResponse', '返回品牌列表。')
        }
      },
      post: {
        tags: ['catalog'],
        summary: '管理端创建品牌',
        security: adminSessionSecurity,
        requestBody: jsonRequestBody(
          'AdminBrandRequest',
          '创建品牌。'
        ),
        responses: {
          '200': jsonResponse('AdminBrandResponse', '品牌创建成功。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.models.adminBrandDetail('{id}')]: {
      put: {
        tags: ['catalog'],
        summary: '管理端更新品牌',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '品牌 ID。')],
        requestBody: jsonRequestBody(
          'AdminBrandRequest',
          '更新品牌。'
        ),
        responses: {
          '200': jsonResponse('AdminBrandResponse', '品牌已更新。'),
          '400': jsonResponse('ErrorResponse', '缺少品牌 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '品牌不存在。')
        }
      }
    },
} as const;
