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

export const rankingPaths = {
    [API_ROUTES.rankings.adminList]: {
      get: {
        tags: ['rankings'],
        summary: '管理端查询榜单列表',
        security: adminSessionSecurity,
        parameters: [
          {
            name: 'scope',
            in: 'query',
            required: false,
            description: '榜单范围。',
            schema: {
              type: 'string',
              enum: ['official', 'community']
            }
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            description: '榜单状态。',
            schema: {
              type: 'string',
              enum: ['pending', 'published', 'rejected', 'hidden']
            }
          }
        ],
        responses: {
          '200': jsonResponse('AdminRankingsResponse', '返回榜单审核列表。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.rankings.adminItems]: {
      get: {
        tags: ['rankings'],
        summary: '管理端查询评分对象列表',
        security: adminSessionSecurity,
        parameters: [
          stringQueryParameter('status', '评分对象状态（pending/published/rejected/hidden）。'),
          stringQueryParameter('keyword', '按名称模糊搜索。')
        ],
        responses: {
          '200': jsonResponse('AdminRankingsResponse', '返回评分对象列表。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.rankings.adminStatus('{id}')]: {
      put: {
        tags: ['rankings'],
        summary: '管理端更新榜单状态',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '榜单 ID。')],
        requestBody: jsonRequestBody(
          'UpdateRankingStatusRequest',
          '更新榜单审核状态。'
        ),
        responses: {
          '200': jsonResponse('RankingResponse', '榜单状态更新成功。'),
          '400': jsonResponse('ErrorResponse', '缺少榜单 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '榜单不存在。')
        }
      }
    },
    [API_ROUTES.rankings.adminItemStatus('{id}')]: {
      put: {
        tags: ['rankings'],
        summary: '管理端更新榜单条目状态',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '榜单条目 ID。')],
        requestBody: jsonRequestBody(
          'UpdateRatingTargetStatusRequest',
          '更新榜单条目审核状态。'
        ),
        responses: {
          '200': jsonResponse(
            'RatingTargetDetailResponse',
            '榜单条目状态更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少榜单条目 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '榜单条目不存在。')
        }
      }
    },
    [API_ROUTES.rankings.adminRankingComments]: {
      get: {
        tags: ['rankings'],
        summary: '管理端获取榜单评论列表',
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
            'AdminRankingCommentsResponse',
            '返回榜单评论审核列表。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.rankings.adminRankingCommentDetail('{id}')]: {
      put: {
        tags: ['rankings'],
        summary: '管理端更新榜单评论状态',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '评论 ID。')],
        requestBody: jsonRequestBody(
          'UpdateRankingCommentStatusRequest',
          '更新榜单评论审核状态。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminRankingCommentResponse',
            '榜单评论状态更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      }
    },
    [API_ROUTES.rankings.adminRatingTargetComments]: {
      get: {
        tags: ['rankings'],
        summary: '管理端获取榜单条目评论列表',
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
            'AdminRatingTargetCommentsResponse',
            '返回评分对象评论审核列表。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.rankings.adminRatingTargetCommentDetail('{id}')]: {
      put: {
        tags: ['rankings'],
        summary: '管理端更新评分对象评论状态',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '评论 ID。')],
        requestBody: jsonRequestBody(
          'UpdateRatingTargetCommentStatusRequest',
          '更新评分对象评论审核状态。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminRatingTargetCommentResponse',
            '评分对象评论状态更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      }
    },
    [API_ROUTES.rankings.comments('{id}')]: {
      post: {
        tags: ['rankings'],
        summary: '发布榜单评论',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '榜单 ID。')],
        requestBody: jsonRequestBody(
          'CreateRankingCommentRequest',
          '创建榜单评论。'
        ),
        responses: {
          '200': jsonResponse(
            'CreateRankingCommentResponse',
            '榜单评论创建成功。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '榜单不存在。')
        }
      }
    },
    [API_ROUTES.rankings.update('{id}')]: {
      put: {
        tags: ['rankings'],
        summary: '更新榜单',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '榜单 ID。')],
        requestBody: jsonRequestBody(
          'UpdateRankingRequest',
          '更新榜单标题、描述和条目配置。'
        ),
        responses: {
          '200': jsonResponse('RankingResponse', '榜单更新成功。'),
          '400': jsonResponse('ErrorResponse', '缺少榜单 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权修改榜单。'),
          '404': jsonResponse('ErrorResponse', '榜单不存在。')
        }
      }
    },
    [API_ROUTES.rankings.overview]: {
      get: {
        tags: ['rankings'],
        summary: '查询榜单列表',
        responses: {
          '200': jsonResponse('RankingsResponse', '返回官方与社区榜单列表。')
        }
      },
      post: {
        tags: ['rankings'],
        summary: '创建榜单',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'CreateRankingRequest',
          '创建社区或官方榜单。'
        ),
        responses: {
          '200': jsonResponse('RankingResponse', '榜单创建成功。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权创建榜单。'),
          '500': jsonResponse('ErrorResponse', '榜单创建失败。')
        }
      }
    },
    [API_ROUTES.rankings.itemDetail('{id}')]: {
      get: {
        tags: ['rankings'],
        summary: '查询榜单条目详情',
        security: optionalSessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '榜单条目 ID。')],
        responses: {
          '200': jsonResponse(
            'RatingTargetDetailResponse',
            '返回榜单条目详情。'
          ),
          '404': jsonResponse('ErrorResponse', '榜单条目不存在。')
        }
      },
      put: {
        tags: ['rankings'],
        summary: '更新评分对象',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '评分对象 ID。')],
        requestBody: jsonRequestBody(
          'AddRatingTargetRequest',
          '更新评分对象内容。'
        ),
        responses: {
          '200': jsonResponse(
            'RatingTargetDetailResponse',
            '评分对象更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评分对象 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权修改评分对象。'),
          '404': jsonResponse('ErrorResponse', '评分对象不存在。')
        }
      },
      delete: {
        tags: ['rankings'],
        summary: '删除评分对象',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '评分对象 ID。')],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '评分对象删除成功。'),
          '400': jsonResponse('ErrorResponse', '缺少评分对象 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权删除评分对象。'),
          '404': jsonResponse('ErrorResponse', '评分对象不存在。')
        }
      }
    },
    [API_ROUTES.rankings.items('{id}')]: {
      post: {
        tags: ['rankings'],
        summary: '为榜单新增评分对象',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '榜单 ID。')],
        requestBody: jsonRequestBody(
          'AddRatingTargetRequest',
          '新增评分对象。'
        ),
        responses: {
          '200': jsonResponse('RatingTargetResponse', '评分对象创建成功。'),
          '400': jsonResponse('ErrorResponse', '缺少榜单 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权新增评分对象。'),
          '404': jsonResponse('ErrorResponse', '榜单不存在。')
        }
      }
    },
    [API_ROUTES.rankings.itemRatings('{id}')]: {
      post: {
        tags: ['rankings'],
        summary: '为评分对象打分',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '评分对象 ID。')],
        requestBody: jsonRequestBody(
          'SubmitRatingTargetRatingRequest',
          '提交评分对象评分。'
        ),
        responses: {
          '200': jsonResponse(
            'SubmitRatingTargetRatingResponse',
            '评分提交成功。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '评分对象不存在。')
        }
      }
    },
    [API_ROUTES.rankings.report('{id}')]: {
      post: {
        tags: ['rankings'],
        summary: '举报榜单',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '榜单 ID。')],
        requestBody: jsonRequestBody(
          'ReportContentRequest',
          '提交举报原因和证据图片。'
        ),
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '举报提交成功。'),
          '400': jsonResponse('ErrorResponse', '举报参数不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '榜单不存在。')
        }
      }
    },
    [API_ROUTES.rankings.itemReport('{id}')]: {
      post: {
        tags: ['rankings'],
        summary: '举报榜单条目',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '榜单条目 ID。')],
        requestBody: jsonRequestBody(
          'ReportContentRequest',
          '提交举报原因和证据图片。'
        ),
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '举报提交成功。'),
          '400': jsonResponse('ErrorResponse', '举报参数不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '榜单条目不存在。')
        }
      }
    },
    [API_ROUTES.rankings.itemReview('{id}')]: {
      post: {
        tags: ['rankings'],
        summary: '为评分对象提交评测',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '评分对象 ID。')],
        requestBody: jsonRequestBody(
          'SubmitRatingTargetReviewRequest',
          '提交评分对象评分与评测内容。'
        ),
        responses: {
          '200': jsonResponse(
            'SubmitRatingTargetReviewResponse',
            '评分对象评测提交成功。'
          ),
          '400': jsonResponse('ErrorResponse', '评测参数不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '评分对象不存在。')
        }
      }
    },
    [API_ROUTES.rankings.itemComments('{id}')]: {
      post: {
        tags: ['rankings'],
        summary: '发布评分对象评论',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '评分对象 ID。')],
        requestBody: jsonRequestBody(
          'CreateRatingTargetCommentRequest',
          '创建评分对象评论或回复。'
        ),
        responses: {
          '200': jsonResponse(
            'CreateRatingTargetCommentResponse',
            '评分对象评论创建成功。'
          ),
          '400': jsonResponse('ErrorResponse', '评论参数不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '评分对象不存在。')
        }
      }
    },
    [API_ROUTES.rankings.itemCommentDetail('{itemId}', '{commentId}')]: {
      put: {
        tags: ['rankings'],
        summary: '更新评分对象评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('itemId', '评分对象 ID。'),
          stringPathParameter('commentId', '评论 ID。')
        ],
        requestBody: jsonRequestBody(
          'UpdateRatingTargetCommentRequest',
          '更新评分对象评论内容。'
        ),
        responses: {
          '200': jsonResponse(
            'CreateRatingTargetCommentResponse',
            '评分对象评论更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论参数。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权修改评论。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      },
      delete: {
        tags: ['rankings'],
        summary: '删除评分对象评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('itemId', '评分对象 ID。'),
          stringPathParameter('commentId', '评论 ID。')
        ],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '评分对象评论删除成功。'),
          '400': jsonResponse('ErrorResponse', '缺少评论参数。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权删除评论。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      }
    },
    [API_ROUTES.rankings.itemCommentLike('{itemId}', '{commentId}')]: {
      post: {
        tags: ['rankings'],
        summary: '点赞榜单条目评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('itemId', '榜单条目 ID。'),
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
    [API_ROUTES.rankings.itemCommentReport('{itemId}', '{commentId}')]: {
      post: {
        tags: ['rankings'],
        summary: '举报榜单条目评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('itemId', '榜单条目 ID。'),
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
    [API_ROUTES.rankings.detail('{id}')]: {
      get: {
        tags: ['rankings'],
        summary: '查询榜单详情',
        parameters: [stringPathParameter('id', '榜单 ID。')],
        responses: {
          '200': jsonResponse('RankingResponse', '返回榜单详情及条目。'),
          '404': jsonResponse('ErrorResponse', '榜单不存在。')
        }
      }
    }
} as const;
