import { API_ROUTES } from '@feijia/shared';

import { jsonResponse, stringQueryParameter } from '../builders';
import { adminSessionSecurity } from '../security';

export const adminLogPaths = {
  [API_ROUTES.admin.logsOverview]: {
    get: {
      tags: ['admin-logs'],
      summary: '查看日志概览',
      security: adminSessionSecurity,
      parameters: [
        {
          name: 'source',
          in: 'query',
          required: false,
          description: '日志来源。',
          schema: {
            type: 'string',
            enum: ['local-files']
          }
        }
      ],
      responses: {
        '200': jsonResponse(
          'AdminLogsOverviewResponse',
          '返回日志模式、目录、级别和分类概览。'
        ),
        '400': jsonResponse('ErrorResponse', '日志源无效。'),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '当前无管理员权限。')
      }
    }
  },
  [API_ROUTES.admin.logsFiles]: {
    get: {
      tags: ['admin-logs'],
      summary: '查看日志文件列表',
      security: adminSessionSecurity,
      parameters: [
        {
          name: 'source',
          in: 'query',
          required: false,
          description: '日志来源。',
          schema: {
            type: 'string',
            enum: ['local-files']
          }
        },
        {
          name: 'category',
          in: 'query',
          required: true,
          description: '日志分类。',
          schema: {
            type: 'string',
            enum: ['app', 'request', 'error', 'security']
          }
        },
        stringQueryParameter('limit', '返回条数上限，默认 50。')
      ],
      responses: {
        '200': jsonResponse(
          'AdminLogFilesResponse',
          '返回日志文件列表。'
        ),
        '400': jsonResponse('ErrorResponse', '日志源或分类无效。'),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '当前无管理员权限。')
      }
    }
  },
  [API_ROUTES.admin.logsEntries]: {
    get: {
      tags: ['admin-logs'],
      summary: '查看日志条目',
      security: adminSessionSecurity,
      parameters: [
        {
          name: 'source',
          in: 'query',
          required: false,
          description: '日志来源。',
          schema: {
            type: 'string',
            enum: ['local-files']
          }
        },
        {
          name: 'category',
          in: 'query',
          required: true,
          description: '日志分类。',
          schema: {
            type: 'string',
            enum: ['app', 'request', 'error', 'security']
          }
        },
        {
          name: 'fileName',
          in: 'query',
          required: true,
          description: '日志文件名。',
          schema: {
            type: 'string'
          }
        },
        stringQueryParameter('limit', '返回行数上限，默认 200。'),
        {
          name: 'level',
          in: 'query',
          required: false,
          description: '按级别筛选。',
          schema: {
            type: 'string',
            enum: ['DEBUG', 'INFO', 'WARN', 'ERROR']
          }
        },
        stringQueryParameter('search', '按内容搜索，最大 120 字符。')
      ],
      responses: {
        '200': jsonResponse(
          'AdminLogEntriesResponse',
          '返回日志文件内容条目。'
        ),
        '400': jsonResponse('ErrorResponse', '日志源、分类或文件名无效。'),
        '401': jsonResponse('ErrorResponse', '未登录。'),
        '403': jsonResponse('ErrorResponse', '当前无管理员权限。')
      }
    }
  }
} as const;
