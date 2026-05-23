import { API_ROUTES } from '@feijia/shared';

import {
  jsonRequestBody,
  jsonResponse,
  stringPathParameter,
  stringQueryParameter
} from '../builders';

import {
  optionalSessionOrBearerSecurity,
  sessionOrBearerSecurity
} from '../security';

export const socialPaths = {
    [API_ROUTES.users.profile('{userId}')]: {
      get: {
        tags: ['social'],
        summary: '查看用户资料',
        security: optionalSessionOrBearerSecurity,
        parameters: [stringPathParameter('userId', '用户 ID。')],
        responses: {
          '200': jsonResponse('UserProfileResponse', '返回公开可见的用户资料。'),
          '404': jsonResponse('ErrorResponse', '用户不存在。')
        }
      }
    },
    [API_ROUTES.users.content('{userId}')]: {
      get: {
        tags: ['social'],
        summary: '查看用户公开内容',
        security: optionalSessionOrBearerSecurity,
        parameters: [stringPathParameter('userId', '用户 ID。')],
        responses: {
          '200': jsonResponse('UserContentResponse', '返回当前查看者可见的用户内容。'),
          '403': jsonResponse('ErrorResponse', '当前无权查看该用户内容。'),
          '404': jsonResponse('ErrorResponse', '用户不存在。')
        }
      }
    },
    [API_ROUTES.users.comments('{userId}')]: {
      get: {
        tags: ['social'],
        summary: '查看用户评论列表',
        security: optionalSessionOrBearerSecurity,
        parameters: [
          stringPathParameter('userId', '用户 ID。'),
          stringQueryParameter('page', '页码，默认 1。'),
          stringQueryParameter('pageSize', '每页条数，默认 20。')
        ],
        responses: {
          '200': jsonResponse('UserCommentListResponse', '返回分页的用户评论列表。'),
          '403': jsonResponse('ErrorResponse', '当前无权查看该用户评论。'),
          '404': jsonResponse('ErrorResponse', '用户不存在。')
        }
      }
    },
    [API_ROUTES.users.meProfile]: {
      get: {
        tags: ['social'],
        summary: '查看当前用户资料',
        security: sessionOrBearerSecurity,
        responses: {
          '200': jsonResponse(
            'CurrentUserProfileResponse',
            '返回当前会话可编辑的个人资料。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '用户不存在。')
        }
      },
      put: {
        tags: ['social'],
        summary: '更新当前用户资料',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'UpdateCurrentUserProfileRequest',
          '按需增量更新个人资料，至少提交一个字段。支持头像、封面图、简介、昵称与可见范围等资料字段；手机号请走专用换绑流程。'
        ),
        responses: {
          '200': jsonResponse(
            'CurrentUserProfileResponse',
            '更新后的个人资料。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '用户不存在。'),
          '409': jsonResponse('ErrorResponse', '昵称已被占用。')
        }
      }
    },
    [API_ROUTES.users.mePhoneChangeRequest]: {
      post: {
        tags: ['social'],
        summary: '申请更换手机号',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'PhoneChangeRequest',
          '提交目标手机号和图形验证码，换取短信验证请求。'
        ),
        responses: {
          '200': jsonResponse(
            'PhoneChangeRequestResponse',
            '返回短信验证请求信息。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前账号尚未设置登录密码。'),
          '404': jsonResponse('ErrorResponse', '用户不存在。'),
          '409': jsonResponse('ErrorResponse', '手机号已被其他账号占用。')
        }
      }
    },
    [API_ROUTES.users.mePhoneChangeConfirm]: {
      post: {
        tags: ['social'],
        summary: '确认更换手机号',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'PhoneChangeConfirmRequest',
          '提交短信验证码，完成手机号换绑。'
        ),
        responses: {
          '200': jsonResponse(
            'CurrentUserProfileResponse',
            '返回更新后的个人资料。'
          ),
          '400': jsonResponse('ErrorResponse', '短信验证码无效或已过期。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前账号尚未设置登录密码。'),
          '404': jsonResponse('ErrorResponse', '用户不存在。'),
          '409': jsonResponse('ErrorResponse', '手机号已被其他账号占用。')
        }
      }
    },
    [API_ROUTES.social.follow('{userId}')]: {
      post: {
        tags: ['social'],
        summary: '关注或取消关注用户',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('userId', '目标用户 ID。')],
        responses: {
          '200': jsonResponse(
            'ActionSuccessResponse',
            '关注关系更新成功。'
          ),
          '400': jsonResponse('ErrorResponse', '参数错误或不能关注自己。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '目标用户不存在。')
        }
      }
    },
    [API_ROUTES.social.notifications]: {
      get: {
        tags: ['social'],
        summary: '查看通知列表',
        security: sessionOrBearerSecurity,
        responses: {
          '200': jsonResponse(
            'NotificationsResponse',
            '返回当前用户的通知列表和未读数。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。')
        }
      }
    },
    [API_ROUTES.social.notificationsReadAll]: {
      post: {
        tags: ['social'],
        summary: '将所有通知标记为已读',
        security: sessionOrBearerSecurity,
        responses: {
          '200': jsonResponse(
            'ActionSuccessResponse',
            '所有通知已标记为已读。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。')
        }
      }
    },
    [API_ROUTES.social.notificationRead('{id}')]: {
      post: {
        tags: ['social'],
        summary: '将单条通知标记为已读',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '通知 ID。')],
        responses: {
          '200': jsonResponse(
            'ActionSuccessResponse',
            '通知已标记为已读。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少通知 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '通知不存在。')
        }
      }
    },
    [API_ROUTES.admin.messages]: {
      get: {
        tags: ['social'],
        summary: '查看管理端消息中心列表',
        security: sessionOrBearerSecurity,
        parameters: [
          stringQueryParameter('domain', '按业务域筛选。'),
          stringQueryParameter('type', '按消息类型筛选。'),
          stringQueryParameter('readStatus', '已读筛选：all/read/unread。'),
          stringQueryParameter('limit', '返回条数上限，默认 50。')
        ],
        responses: {
          '200': jsonResponse(
            'AdminMessageListResponse',
            '返回管理端消息中心列表与未读统计。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无管理员权限。')
        }
      }
    },
    [API_ROUTES.admin.messagesReadAll]: {
      post: {
        tags: ['social'],
        summary: '将管理端消息全部标记为已读',
        security: sessionOrBearerSecurity,
        responses: {
          '200': jsonResponse(
            'ActionSuccessResponse',
            '管理端消息已全部标记为已读。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无管理员权限。')
        }
      }
    },
    [API_ROUTES.admin.messageRead('{id}')]: {
      post: {
        tags: ['social'],
        summary: '将单条管理端消息标记为已读',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '消息 ID。')],
        responses: {
          '200': jsonResponse('ActionSuccessResponse', '消息已标记为已读。'),
          '400': jsonResponse('ErrorResponse', '缺少消息 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无管理员权限。'),
          '404': jsonResponse('ErrorResponse', '消息不存在。')
        }
      }
    },
    [API_ROUTES.admin.messageTodos]: {
      get: {
        tags: ['social'],
        summary: '查看管理端审核待办聚合',
        security: sessionOrBearerSecurity,
        responses: {
          '200': jsonResponse(
            'AdminModerationTodosResponse',
            '返回管理端待办总数与各审核域待办数量。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '当前无管理员权限。')
        }
      }
    },
} as const;
