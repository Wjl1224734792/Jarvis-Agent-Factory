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

export const postPaths = {
    [API_ROUTES.feed]: {
      get: {
        tags: ['posts'],
        summary: '查询首页文章 feed',
        security: optionalSessionOrBearerSecurity,
        parameters: [
          {
            name: 'tab',
            in: 'query',
            required: false,
            description: 'feed 标签。',
            schema: {
              type: 'string',
              enum: ['recommended', 'latest', 'following']
            }
          },
          stringQueryParameter('categorySlug', '文章分类 slug。')
        ],
        responses: {
          '200': jsonResponse('HomeFeedResponse', '返回首页文章 feed。')
        }
      }
    },
    [API_ROUTES.circleFeed]: {
      get: {
        tags: ['posts'],
        summary: '查询飞友圈动态 feed',
        security: optionalSessionOrBearerSecurity,
        parameters: [
          {
            name: 'tab',
            in: 'query',
            required: false,
            description: 'feed 标签。',
            schema: {
              type: 'string',
              enum: ['recommended', 'latest', 'following']
            }
          }
        ],
        responses: {
          '200': jsonResponse('CircleFeedResponse', '返回飞友圈动态 feed。')
        }
      }
    },
    [API_ROUTES.posts.create]: {
      post: {
        tags: ['posts'],
        summary: '创建帖子',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'CreatePostRequest',
          '创建文章或动态时提交的内容体。'
        ),
        responses: {
          '200': jsonResponse('CreatePostResponse', '帖子创建成功。'),
          '400': jsonResponse('ErrorResponse', '帖子内容、分类或媒体校验失败。'),
          '401': jsonResponse('ErrorResponse', '未登录。')
        }
      }
    },
    [API_ROUTES.posts.view('{id}')]: {
      post: {
        tags: ['posts'],
        summary: '记录帖子浏览',
        parameters: [stringPathParameter('id', '帖子 ID。')],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '浏览记录成功。'),
          '404': jsonResponse('ErrorResponse', '帖子不存在。')
        }
      }
    },
    [API_ROUTES.posts.comments('{id}')]: {
      post: {
        tags: ['posts'],
        summary: '发布帖子评论',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '帖子 ID。')],
        requestBody: jsonRequestBody(
          'CreatePostCommentRequest',
          '创建帖子评论或回复。'
        ),
        responses: {
          '200': jsonResponse(
            'CreatePostCommentResponse',
            '评论创建成功。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '帖子或父评论不存在。')
        }
      }
    },
    [API_ROUTES.posts.interaction('{id}', '{type}')]: {
      post: {
        tags: ['posts'],
        summary: '更新帖子互动状态',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('id', '帖子 ID。'),
          {
            name: 'type',
            in: 'path',
            required: true,
            description: '互动类型。',
            schema: {
              type: 'string',
              enum: ['like', 'favorite', 'share']
            }
          }
        ],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '互动状态更新成功。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '帖子不存在。')
        }
      }
    },
    [API_ROUTES.posts.report('{id}')]: {
      post: {
        tags: ['posts'],
        summary: '举报帖子',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '帖子 ID。')],
        requestBody: jsonRequestBody(
          'ReportContentRequest',
          '提交举报原因和证据图片。'
        ),
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '举报提交成功。'),
          '400': jsonResponse('ErrorResponse', '举报参数不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '帖子不存在。')
        }
      }
    },
    [API_ROUTES.posts.adminList]: {
      get: {
        tags: ['posts'],
        summary: '管理端查询帖子列表',
        security: adminSessionSecurity,
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            description: '帖子状态筛选。',
            schema: {
              type: 'string',
              enum: ['pending', 'published', 'rejected', 'hidden']
            }
          }
        ],
        responses: {
          '200': jsonResponse('AdminPostsResponse', '返回帖子审核列表。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.posts.detail('{id}')]: {
      get: {
        tags: ['posts'],
        summary: '查询帖子详情',
        parameters: [
          stringPathParameter('id', '帖子 ID。'),
          {
            name: 'commentSort',
            in: 'query',
            required: false,
            description: '评论排序方式，支持 hot 或 latest。',
            schema: {
              type: 'string',
              enum: ['hot', 'latest']
            }
          }
        ],
        responses: {
          '200': jsonResponse('PostDetailResponse', '返回帖子详情与评论。'),
          '404': jsonResponse('ErrorResponse', '帖子不存在。')
        }
      },
      put: {
        tags: ['posts'],
        summary: '更新帖子',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '帖子 ID。')],
        requestBody: jsonRequestBody(
          'UpdatePostRequest',
          '更新帖子内容和媒体。'
        ),
        responses: {
          '200': jsonResponse('PostDetailResponse', '帖子更新成功。'),
          '400': jsonResponse('ErrorResponse', '缺少帖子 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权修改帖子。'),
          '404': jsonResponse('ErrorResponse', '帖子不存在。')
        }
      },
      delete: {
        tags: ['posts'],
        summary: '删除帖子',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '帖子 ID。')],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '帖子删除成功。'),
          '400': jsonResponse('ErrorResponse', '缺少帖子 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权删除帖子。'),
          '404': jsonResponse('ErrorResponse', '帖子不存在。')
        }
      }
    },
    [API_ROUTES.posts.commentDetail('{postId}', '{commentId}')]: {
      put: {
        tags: ['posts'],
        summary: '更新帖子评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('postId', '帖子 ID。'),
          stringPathParameter('commentId', '评论 ID。')
        ],
        requestBody: jsonRequestBody(
          'UpdatePostCommentRequest',
          '更新评论内容。'
        ),
        responses: {
          '200': jsonResponse(
            'CreatePostCommentResponse',
            '帖子评论更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论参数。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权修改评论。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      },
      delete: {
        tags: ['posts'],
        summary: '删除帖子评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('postId', '帖子 ID。'),
          stringPathParameter('commentId', '评论 ID。')
        ],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '帖子评论删除成功。'),
          '400': jsonResponse('ErrorResponse', '缺少评论参数。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无权删除评论。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      }
    },
    [API_ROUTES.posts.commentLike('{postId}', '{commentId}')]: {
      post: {
        tags: ['posts'],
        summary: '点赞帖子评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('postId', '帖子 ID。'),
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
    [API_ROUTES.posts.commentReport('{postId}', '{commentId}')]: {
      post: {
        tags: ['posts'],
        summary: '举报帖子评论',
        security: sessionOrBearerSecurity,
        parameters: [
          stringPathParameter('postId', '帖子 ID。'),
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
    [API_ROUTES.posts.adminDetail('{id}')]: {
      put: {
        tags: ['posts'],
        summary: '管理端更新帖子状态',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '帖子 ID。')],
        requestBody: jsonRequestBody(
          'AdminPostStatusUpdateRequest',
          '更新帖子审核状态。'
        ),
        responses: {
          '200': jsonResponse('AdminPostResponse', '帖子状态更新成功。'),
          '400': jsonResponse('ErrorResponse', '缺少帖子 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '帖子不存在。')
        }
      }
    },
    [API_ROUTES.posts.adminOfficialDetail('{id}')]: {
      get: {
        tags: ['posts'],
        summary: '管理端获取官方文章详情',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '官方文章 ID。')],
        responses: {
          '200': jsonResponse('PostDetailResponse', '返回官方文章详情。'),
          '400': jsonResponse('ErrorResponse', '缺少文章 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '官方文章不存在。')
        }
      },
      put: {
        tags: ['posts'],
        summary: '管理端更新官方文章',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '官方文章 ID。')],
        requestBody: jsonRequestBody(
          'AdminOfficialArticleUpdateRequest',
          '更新官方文章内容。'
        ),
        responses: {
          '200': jsonResponse('PostDetailResponse', '官方文章更新成功。'),
          '400': jsonResponse('ErrorResponse', '文章参数不合法。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '官方文章不存在。')
        }
      },
      delete: {
        tags: ['posts'],
        summary: '管理端删除官方文章',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '官方文章 ID。')],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '官方文章删除成功。'),
          '400': jsonResponse('ErrorResponse', '缺少文章 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '官方文章不存在。')
        }
      }
    },
    [API_ROUTES.posts.adminComments]: {
      get: {
        tags: ['posts'],
        summary: '管理端查询帖子评论列表',
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
            'AdminPostCommentsResponse',
            '返回帖子评论审核列表。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.posts.adminReports('{id}')]: {
      get: {
        tags: ['posts'],
        summary: '管理端获取帖子举报记录',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '帖子 ID。')],
        responses: {
          '200': jsonResponse(
            'AdminReportRecordsResponse',
            '返回帖子举报记录。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少帖子 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.posts.adminCommentReports('{id}')]: {
      get: {
        tags: ['posts'],
        summary: '管理端获取帖子评论举报记录',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '评论 ID。')],
        responses: {
          '200': jsonResponse(
            'AdminReportRecordsResponse',
            '返回帖子评论举报记录。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.posts.adminCommentDetail('{id}')]: {
      put: {
        tags: ['posts'],
        summary: '管理端更新帖子评论状态',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '评论 ID。')],
        requestBody: jsonRequestBody(
          'AdminPostCommentStatusUpdateRequest',
          '更新帖子评论审核状态。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminPostCommentResponse',
            '帖子评论状态更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少评论 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '评论不存在。')
        }
      }
    },
} as const;
