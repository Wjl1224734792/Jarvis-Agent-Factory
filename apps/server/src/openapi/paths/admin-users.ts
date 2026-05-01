import { API_ROUTES } from '@feijia/shared';

import {
  jsonRequestBody,
  jsonResponse,
  stringPathParameter,
  stringQueryParameter
} from '../builders';
import { adminSessionSecurity } from '../security';

export const adminUserPaths = {
  [API_ROUTES.admin.users]: {
    get: {
      tags: ['admin-users'],
      summary: '查看后台用户列表',
      security: adminSessionSecurity,
      parameters: [
        stringQueryParameter('keyword', '按用户 ID、昵称或手机号搜索。'),
        stringQueryParameter('status', '状态筛选：all、active、banned。'),
        stringQueryParameter('role', '角色筛选：all、user、admin。'),
        stringQueryParameter('page', '分页页码，默认 1。'),
        stringQueryParameter('pageSize', '每页条数，默认 20。')
      ],
      responses: {
        '200': jsonResponse(
          'AdminUsersResponse',
          '返回用户列表、封禁状态、会话与内容统计。'
        ),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '当前无管理员权限。')
      }
    }
  },
  [API_ROUTES.admin.userDetail('{id}')]: {
    get: {
      tags: ['admin-users'],
      summary: '查看后台用户详情',
      security: adminSessionSecurity,
      parameters: [stringPathParameter('id', '用户 ID。')],
      responses: {
        '200': jsonResponse(
          'AdminUserResponse',
          '返回用户详情与近期会话。'
        ),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '当前无管理员权限。'),
        '404': jsonResponse('ErrorResponse', '用户不存在。')
      }
    }
  },
  [API_ROUTES.admin.userBan('{id}')]: {
    post: {
      tags: ['admin-users'],
      summary: '封禁用户',
      security: adminSessionSecurity,
      parameters: [stringPathParameter('id', '用户 ID。')],
      requestBody: jsonRequestBody(
        'AdminBanUserRequest',
        '提交封禁原因与可选封禁截止时间。'
      ),
      responses: {
        '200': jsonResponse(
          'AdminUserResponse',
          '返回封禁后的用户详情。'
        ),
        '400': jsonResponse('ErrorResponse', '目标账号不能被封禁或参数无效。'),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '当前无管理员权限。'),
        '404': jsonResponse('ErrorResponse', '用户不存在。')
      }
    }
  },
  [API_ROUTES.admin.userUnban('{id}')]: {
    post: {
      tags: ['admin-users'],
      summary: '解封用户',
      security: adminSessionSecurity,
      parameters: [stringPathParameter('id', '用户 ID。')],
      responses: {
        '200': jsonResponse(
          'AdminUserResponse',
          '返回解封后的用户详情。'
        ),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '当前无管理员权限。'),
        '404': jsonResponse('ErrorResponse', '用户不存在。')
      }
    }
  }
} as const;
