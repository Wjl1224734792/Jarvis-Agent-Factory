import { API_ROUTES } from '@feijia/shared';

import {
  jsonRequestBody,
  jsonResponse,
  stringPathParameter
} from '../builders';

import {
  optionalSessionOrBearerSecurity,
  sessionOrBearerSecurity,
  adminSessionSecurity
} from '../security';

export const reviewPaths = {
    [API_ROUTES.models.adminReviews]: {
      get: {
        tags: ['reviews'],
        summary: '管理端获取评测列表',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse('AdminReviewsResponse', '返回评测审核列表。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.models.adminReviewDetail('{id}')]: {
      put: {
        tags: ['reviews'],
        summary: '管理端更新评测状态',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '评测 ID。')],
        requestBody: jsonRequestBody(
          'UpdateReviewStatusRequest',
          '更新评测审核状态。'
        ),
        responses: {
          '200': jsonResponse('AdminReviewResponse', '评测状态更新成功。'),
          '400': jsonResponse('ErrorResponse', '缺少评测 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '评测不存在。')
        }
      }
    },
    [API_ROUTES.models.adminReviewReports('{id}')]: {
      get: {
        tags: ['reviews'],
        summary: '管理端获取评测举报记录',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '评测 ID。')],
        responses: {
          '200': jsonResponse(
            'AdminReportRecordsResponse',
            '返回评测举报记录。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评测 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.models.adminReviewComments]: {
      get: {
        tags: ['reviews'],
        summary: '管理端获取评测评论列表',
        security: adminSessionSecurity,
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            description: '评论状态筛选。',
            schema: {
              type: 'string',
              enum: ['pending', 'visible', 'hidden']
            }
          }
        ],
        responses: {
          '200': jsonResponse(
            'AdminReviewCommentsResponse',
            '返回评测评论审核列表。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.models.adminReviewCommentDetail('{id}')]: {
      put: {
        tags: ['reviews'],
        summary: '管理端更新评测评论状态',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '评论 ID。')],
        requestBody: jsonRequestBody(
          'UpdateReviewCommentStatusRequest',
          '更新评测评论审核状态。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminReviewCommentResponse',
            '评测评论状态更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      }
    },
    [API_ROUTES.models.adminReviewCommentReports('{id}')]: {
      get: {
        tags: ['reviews'],
        summary: '管理端获取评测评论举报记录',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '评论 ID。')],
        responses: {
          '200': jsonResponse(
            'AdminReportRecordsResponse',
            '返回评测评论举报记录。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.models.reviewComments('{reviewId}')]: {
      get: {
        tags: ['reviews'],
        summary: '查询评测评论列表',
        security: optionalSessionOrBearerSecurity,
        parameters: [stringPathParameter('reviewId', '评测 ID。')],
        responses: {
          '200': jsonResponse('ReviewCommentsResponse', '返回评测评论树。'),
          '404': jsonResponse('ErrorResponse', '评测不存在。')
        }
      },
      post: {
        tags: ['reviews'],
        summary: '发布评测评论',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('reviewId', '评测 ID。')],
        requestBody: jsonRequestBody(
          'CreateReviewCommentRequest',
          '创建评测评论或回复。'
        ),
        responses: {
          '200': jsonResponse(
            'CreateReviewCommentResponse',
            '评测评论创建成功。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '评测或父评论不存在。')
        }
      }
    },
    [API_ROUTES.models.reviewCommentDetail('{reviewId}', '{commentId}')]: {
      put: {
        tags: ['reviews'],
        summary: '更新评测评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('reviewId', '评测 ID。'),
          stringPathParameter('commentId', '评论 ID。')
        ],
        requestBody: jsonRequestBody(
          'UpdateReviewCommentRequest',
          '更新评测评论内容。'
        ),
        responses: {
          '200': jsonResponse(
            'CreateReviewCommentResponse',
            '评测评论更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论参数。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权修改评论。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      },
      delete: {
        tags: ['reviews'],
        summary: '删除评测评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('reviewId', '评测 ID。'),
          stringPathParameter('commentId', '评论 ID。')
        ],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '评测评论删除成功。'),
          '400': jsonResponse('ErrorResponse', '缺少评论参数。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权删除评论。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      }
    },
    [API_ROUTES.models.reviewLike('{reviewId}')]: {
      post: {
        tags: ['reviews'],
        summary: '点赞评测',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('reviewId', '评测 ID。')],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '点赞状态更新成功。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '评测不存在。')
        }
      }
    },
    [API_ROUTES.models.reviewCommentLike('{reviewId}', '{commentId}')]: {
      post: {
        tags: ['reviews'],
        summary: '点赞评测评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('reviewId', '评测 ID。'),
          stringPathParameter('commentId', '评论 ID。')
        ],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '点赞状态更新成功。'),
          '400': jsonResponse('ErrorResponse', '缺少评论参数。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      }
    },
    [API_ROUTES.models.reviewCommentReport('{reviewId}', '{commentId}')]: {
      post: {
        tags: ['reviews'],
        summary: '举报评测评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('reviewId', '评测 ID。'),
          stringPathParameter('commentId', '评论 ID。')
        ],
        requestBody: jsonRequestBody(
          'ReportContentRequest',
          '提交举报原因和证据图片。'
        ),
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '举报提交成功。'),
          '400': jsonResponse('ErrorResponse', '举报参数不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      }
    },
    [API_ROUTES.models.reviewReport('{reviewId}')]: {
      post: {
        tags: ['reviews'],
        summary: '举报评测',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('reviewId', '评测 ID。')],
        requestBody: jsonRequestBody(
          'ReportContentRequest',
          '提交举报原因和证据图片。'
        ),
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '举报提交成功。'),
          '400': jsonResponse('ErrorResponse', '举报参数不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '评测不存在。')
        }
      }
    },
} as const;
