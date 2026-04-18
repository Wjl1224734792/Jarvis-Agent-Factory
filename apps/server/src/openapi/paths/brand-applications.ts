import { API_ROUTES } from '@feijia/shared';

import {
  jsonRequestBody,
  jsonResponse,
  stringPathParameter
} from '../builders';

import {
  sessionOrBearerSecurity,
  adminSessionSecurity
} from '../security';

export const brandApplicationPaths = {
    [API_ROUTES.brandApplications.create]: {
      post: {
        tags: ['brand-applications'],
        summary: '提交品牌申请',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'CreateBrandApplicationRequest',
          '提交品牌申请资料。'
        ),
        responses: {
          '200': jsonResponse(
            'BrandApplicationResponse',
            '品牌申请创建成功。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。')
        }
      }
    },
    [API_ROUTES.brandApplications.detail('{id}')]: {
      get: {
        tags: ['brand-applications'],
        summary: '查看品牌申请详情',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '品牌申请 ID。')],
        responses: {
          '200': jsonResponse(
            'BrandApplicationResponse',
            '返回品牌申请详情。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '品牌申请不存在。')
        }
      },
      put: {
        tags: ['brand-applications'],
        summary: '更新品牌申请',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '品牌申请 ID。')],
        requestBody: jsonRequestBody(
          'UpdateBrandApplicationRequest',
          '更新自己提交的品牌申请。'
        ),
        responses: {
          '200': jsonResponse(
            'BrandApplicationResponse',
            '品牌申请已更新。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '无权更新该申请。'),
          '404': jsonResponse('ErrorResponse', '品牌申请不存在。')
        }
      }
    },
    [API_ROUTES.brandApplications.adminList]: {
      get: {
        tags: ['brand-applications'],
        summary: '管理端查看品牌申请列表',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse(
            'BrandApplicationsResponse',
            '返回全部品牌申请。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.brandApplications.adminDetail('{id}')]: {
      put: {
        tags: ['brand-applications'],
        summary: '管理端审核品牌申请',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '品牌申请 ID。')],
        requestBody: jsonRequestBody(
          'UpdateBrandApplicationStatusRequest',
          '更新品牌申请状态；当 status 为 rejected 时必须提供 rejectionReason。'
        ),
        responses: {
          '200': jsonResponse(
            'BrandApplicationResponse',
            '品牌申请状态已更新。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '品牌申请不存在。')
        }
      }
    },
} as const;
