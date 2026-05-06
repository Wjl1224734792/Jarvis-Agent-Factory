import { API_ROUTES } from '@feijia/shared';

import {
  jsonRequestBody,
  jsonResponse,
  stringPathParameter,
  stringQueryParameter
} from '../builders';
import { adminSessionSecurity } from '../security';

export const auditPaths = {
  [API_ROUTES.admin.audits]: {
    get: {
      tags: ['audits'],
      summary: '查看审核记录列表',
      security: adminSessionSecurity,
      parameters: [
        {
          name: 'domain',
          in: 'query',
          required: false,
          description: '按审核域筛选。',
          schema: {
            type: 'string',
            enum: [
              'post',
              'review',
              'file',
              'brand_application',
              'aircraft_submission',
              'ranking',
              'rating_target',
              'comment'
            ]
          }
        },
        stringQueryParameter('entityId', '按实体 ID 筛选。'),
        stringQueryParameter('limit', '返回条数上限，默认 50。')
      ],
      responses: {
        '200': jsonResponse(
          'AdminAuditRecordListResponse',
          '返回审核记录列表。'
        ),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '当前无管理员权限。')
      }
    }
  },
  [API_ROUTES.admin.auditManualReview('{id}')]: {
    put: {
      tags: ['audits'],
      summary: '人工审核记录',
      security: adminSessionSecurity,
      parameters: [stringPathParameter('id', '审核记录 ID。')],
      requestBody: jsonRequestBody(
        'AdminAuditManualDecisionRequest',
        '提交人工审核决定与可选备注。'
      ),
      responses: {
        '200': jsonResponse(
          'AdminAuditRecordResponse',
          '人工审核完成。'
        ),
        '400': jsonResponse('ErrorResponse', '缺少审核记录 ID。'),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse(
          'ErrorResponse',
          '当前无管理员权限或不支持人工审核。'
        ),
        '404': jsonResponse('ErrorResponse', '审核记录不存在。')
      }
    }
  },
  [API_ROUTES.audits.qiniuCallback]: {
    post: {
      tags: ['audits'],
      summary: '七牛审核回调',
      description:
        '接收七牛内容审核平台的异步回调通知，用于处理视频审核结果。',
      responses: {
        '200': {
          description: '回调处理成功。'
        },
        '401': jsonResponse('ErrorResponse', '缺少回调鉴权。'),
        '403': jsonResponse('ErrorResponse', '回调签名验证失败。')
      }
    }
  }
} as const;
