import { API_ROUTES } from '@feijia/shared';

import {
  jsonRequestBody,
  jsonResponse,
  stringPathParameter,
  stringQueryParameter
} from '../builders';

import {
  optionalSessionOrBearerSecurity,
  sessionOrBearerSecurity,
  adminSessionSecurity
} from '../security';

export const modelPaths = {
    [API_ROUTES.models.list]: {
      get: {
        tags: ['models'],
        summary: '查询机型列表',
        parameters: [
          stringQueryParameter('categorySlug', '分类 slug，可重复传多个值。'),
          stringQueryParameter('brandSlug', '品牌 slug，可重复传多个值。'),
          stringQueryParameter('powerType', '动力类型，可重复传多个值。'),
          stringQueryParameter('keyword', '按名称或摘要模糊搜索。')
        ],
        responses: {
          '200': jsonResponse('ModelListResponse', '返回机型列表与筛选条件。')
        }
      }
    },
    [API_ROUTES.models.detail('{slug}')]: {
      get: {
        tags: ['models'],
        summary: '查询机型详情',
        parameters: [stringPathParameter('slug', '机型 slug。')],
        responses: {
          '200': jsonResponse('ModelDetailResponse', '返回单个机型详情。'),
          '404': jsonResponse('ErrorResponse', '机型不存在。')
        }
      }
    },
    [API_ROUTES.models.compare]: {
      get: {
        tags: ['models'],
        summary: '对比飞行器',
        description: '按 slug 批量对比 2-5 个飞行器的核心参数与价格。',
        parameters: [
          stringQueryParameter('slugs', '机型 slug 列表，逗号分隔，最少 2 个最多 5 个。')
        ],
        responses: {
          '200': jsonResponse('ModelCompareResponse', '返回机型对比结果。'),
          '400': jsonResponse('ErrorResponse', '请求参数缺失或不合法。')
        }
      }
    },
    [API_ROUTES.models.view('{slug}')]: {
      post: {
        tags: ['models'],
        summary: '记录机型浏览',
        parameters: [stringPathParameter('slug', '机型 slug。')],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '已记录浏览。'),
          '404': jsonResponse('ErrorResponse', '机型不存在。')
        }
      }
    },
    [API_ROUTES.models.comments('{slug}')]: {
      get: {
        tags: ['models'],
        summary: '查询机型评论列表',
        security: optionalSessionOrBearerSecurity,
        parameters: [stringPathParameter('slug', '机型 slug。')],
        responses: {
          '200': jsonResponse('ModelCommentsResponse', '返回机型评论树。'),
          '404': jsonResponse('ErrorResponse', '机型不存在。')
        }
      },
      post: {
        tags: ['models'],
        summary: '发布机型评论',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('slug', '机型 slug。')],
        requestBody: jsonRequestBody(
          'CreateModelCommentRequest',
          '创建机型评论或回复。'
        ),
        responses: {
          '200': jsonResponse(
            'CreateModelCommentResponse',
            '评论创建成功。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '机型或父评论不存在。')
        }
      }
    },
    [API_ROUTES.models.commentDetail('{slug}', '{commentId}')]: {
      put: {
        tags: ['models'],
        summary: '更新机型评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('slug', '机型 slug。'),
          stringPathParameter('commentId', '评论 ID。')
        ],
        requestBody: jsonRequestBody(
          'UpdateModelCommentRequest',
          '更新机型评论内容。'
        ),
        responses: {
          '200': jsonResponse(
            'CreateModelCommentResponse',
            '机型评论更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论参数。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权修改评论。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      },
      delete: {
        tags: ['models'],
        summary: '删除机型评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('slug', '机型 slug。'),
          stringPathParameter('commentId', '评论 ID。')
        ],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '机型评论删除成功。'),
          '400': jsonResponse('ErrorResponse', '缺少评论参数。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权删除评论。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      }
    },
    [API_ROUTES.models.commentLike('{slug}', '{commentId}')]: {
      post: {
        tags: ['models'],
        summary: '点赞机型评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('slug', '机型 slug。'),
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
    [API_ROUTES.models.commentReport('{slug}', '{commentId}')]: {
      post: {
        tags: ['models'],
        summary: '举报机型评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('slug', '机型 slug。'),
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
    [API_ROUTES.models.interactions('{slug}', '{type}')]: {
      post: {
        tags: ['models'],
        summary: '更新机型互动状态',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('slug', '机型 slug。'),
          {
            name: 'type',
            in: 'path',
            required: true,
            description: '互动类型。',
            schema: {
              type: 'string',
              enum: ['interested', 'favorite', 'share']
            }
          }
        ],
        responses: {
          '200': jsonResponse(
            'ModelInteractionResponse',
            '返回更新后的互动统计。'
          ),
          '400': jsonResponse('ErrorResponse', '互动类型不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '机型不存在。')
        }
      }
    },
    [API_ROUTES.models.adminList]: {
      post: {
        tags: ['models'],
        summary: '管理端创建机型',
        security: adminSessionSecurity,
        requestBody: jsonRequestBody(
          'AdminModelRequest',
          '创建机型资料。'
        ),
        responses: {
          '200': jsonResponse('AdminModelResponse', '机型创建成功。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '500': jsonResponse('ErrorResponse', '机型创建失败。')
        }
      }
    },
    [API_ROUTES.models.adminDetail('{id}')]: {
      get: {
        tags: ['models'],
        summary: '管理端查看机型详情',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '机型 ID。')],
        responses: {
          '200': jsonResponse('AdminModelResponse', '返回机型管理端详情。'),
          '400': jsonResponse('ErrorResponse', '缺少机型 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '机型不存在。')
        }
      },
      put: {
        tags: ['models'],
        summary: '管理端更新机型',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '机型 ID。')],
        requestBody: jsonRequestBody(
          'AdminModelRequest',
          '更新机型资料。'
        ),
        responses: {
          '200': jsonResponse('AdminModelResponse', '机型更新成功。'),
          '400': jsonResponse('ErrorResponse', '缺少机型 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '机型不存在。')
        }
      }
    },
    [API_ROUTES.models.adminComments]: {
      get: {
        tags: ['models'],
        summary: '管理端获取机型评论列表',
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
            'AdminModelCommentsResponse',
            '返回机型评论审核列表。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.models.adminReports('{id}')]: {
      get: {
        tags: ['models'],
        summary: '管理端获取机型举报记录',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '机型 ID。')],
        responses: {
          '200': jsonResponse(
            'AdminReportRecordsResponse',
            '返回机型举报记录。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少机型 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.models.adminCommentDetail('{id}')]: {
      put: {
        tags: ['models'],
        summary: '管理端更新机型评论状态',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '评论 ID。')],
        requestBody: jsonRequestBody(
          'UpdateModelCommentStatusRequest',
          '更新机型评论状态。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminModelCommentResponse',
            '机型评论状态更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      }
    },
    [API_ROUTES.models.adminCommentReports('{id}')]: {
      get: {
        tags: ['models'],
        summary: '管理端获取机型评论举报记录',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '评论 ID。')],
        responses: {
          '200': jsonResponse(
            'AdminReportRecordsResponse',
            '返回机型评论举报记录。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.models.report('{slug}')]: {
      post: {
        tags: ['models'],
        summary: '举报机型资料',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('slug', '机型 slug。')],
        requestBody: jsonRequestBody(
          'ReportContentRequest',
          '提交举报原因和证据图片。'
        ),
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '举报提交成功。'),
          '400': jsonResponse('ErrorResponse', '举报参数不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '机型不存在。')
        }
      }
    },
    [API_ROUTES.models.reviews('{slug}')]: {
      get: {
        tags: ['models'],
        summary: '查询机型评测列表',
        parameters: [stringPathParameter('slug', '机型 slug。')],
        responses: {
          '200': jsonResponse('ModelReviewsResponse', '返回当前机型的评测列表。'),
          '404': jsonResponse('ErrorResponse', '机型不存在。')
        }
      },
      post: {
        tags: ['models'],
        summary: '发布机型评测',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('slug', '机型 slug。')],
        requestBody: jsonRequestBody(
          'SubmitModelReviewRequest',
          '提交评测分数与内容。'
        ),
        responses: {
          '200': jsonResponse('SubmitModelReviewResponse', '评测提交成功。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '机型不存在。')
        }
      }
    },
} as const;
