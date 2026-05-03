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

export const submissionPaths = {
    [API_ROUTES.submissions.create]: {
      post: {
        tags: ['submissions'],
        summary: '提交飞行器投稿',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'CreateAircraftSubmissionRequest',
          '提交机型投稿的基础资料、媒体和参数。lifecycleStatus 与机型详情页状态保持一致，可选值包括概念、研发、测试、未发布、已发布、未上市、已上市。'
        ),
        responses: {
          '200': jsonResponse(
            'AircraftSubmissionResponse',
            '投稿创建成功。'
          ),
          '400': jsonResponse('ErrorResponse', '视频资源不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。')
        }
      }
    },
    [API_ROUTES.submissions.detail('{id}')]: {
      get: {
        tags: ['submissions'],
        summary: '查看飞行器投稿详情',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '投稿 ID。')],
        responses: {
          '200': jsonResponse(
            'AircraftSubmissionResponse',
            '返回投稿详情。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '无权查看该投稿。'),
          '404': jsonResponse('ErrorResponse', '投稿不存在。')
        }
      },
      put: {
        tags: ['submissions'],
        summary: '更新自己的飞行器投稿',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '投稿 ID。')],
        requestBody: jsonRequestBody(
          'UpdateAircraftSubmissionRequest',
          '更新已提交的投稿内容。可同步修改 lifecycleStatus、封面媒体、简介与参数信息。'
        ),
        responses: {
          '200': jsonResponse(
            'AircraftSubmissionResponse',
            '投稿已更新。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '无权更新该投稿。'),
          '404': jsonResponse('ErrorResponse', '投稿不存在。')
        }
      },
      delete: {
        tags: ['submissions'],
        summary: '删除自己的飞行器投稿',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '投稿 ID。')],
        responses: {
          '200': jsonResponse(
            'ActionSuccessResponse',
            '投稿已删除。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '无权删除该投稿。'),
          '404': jsonResponse('ErrorResponse', '投稿不存在。')
        }
      }
    },
    [API_ROUTES.submissions.adminList]: {
      get: {
        tags: ['submissions'],
        summary: '管理端查看飞行器投稿列表',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse(
            'AircraftSubmissionsResponse',
            '返回全部投稿。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.submissions.adminDetail('{id}')]: {
      get: {
        tags: ['submissions'],
        summary: '管理端查看飞行器投稿详情',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '投稿 ID。')],
        responses: {
          '200': jsonResponse(
            'AircraftSubmissionResponse',
            '返回投稿详情。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '投稿不存在。')
        }
      },
      put: {
        tags: ['submissions'],
        summary: '管理端审核飞行器投稿',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '投稿 ID。')],
        requestBody: jsonRequestBody(
          'UpdateAircraftSubmissionStatusRequest',
          '更新投稿状态；当 status 为 rejected 时必须提供 rejectionReason。'
        ),
        responses: {
          '200': jsonResponse(
            'AircraftSubmissionResponse',
            '投稿状态已更新。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '投稿不存在。')
        }
      }
    },
} as const;
