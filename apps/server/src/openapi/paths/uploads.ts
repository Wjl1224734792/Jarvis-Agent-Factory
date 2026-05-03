import { API_ROUTES } from '@feijia/shared';

import {
  jsonRequestBody,
  jsonResponse,
  stringPathParameter
} from '../builders';

import { sessionOrBearerSecurity } from '../security';

export const uploadPaths = {
    [API_ROUTES.uploads.init]: {
      post: {
        tags: ['uploads'],
        summary: '初始化文件上传',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'InitUploadRequest',
          '声明业务类型、文件名、类型和大小，换取直传信息。'
        ),
        responses: {
          '200': jsonResponse('InitUploadResponse', '返回 fileId 和直传地址。'),
          '400': jsonResponse('ErrorResponse', '文件类型或大小不符合要求。'),
          '401': jsonResponse('ErrorResponse', '未登录。')
        }
      }
    },
    [API_ROUTES.uploads.complete]: {
      post: {
        tags: ['uploads'],
        summary: '确认文件上传完成',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'CompleteUploadRequest',
          '上传完成后回传 fileId，服务端校验对象信息。'
        ),
        responses: {
          '200': jsonResponse('CompleteUploadResponse', '返回可消费的文件实体。'),
          '400': jsonResponse('ErrorResponse', '对象校验失败。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '上传记录不存在。')
        }
      }
    },
    [API_ROUTES.files.url('{id}')]: {
      get: {
        tags: ['uploads'],
        summary: '获取文件访问地址',
        parameters: [stringPathParameter('id', '文件 ID。')],
        responses: {
          '200': jsonResponse('FileUrlResponse', '返回文件可访问地址。'),
          '400': jsonResponse('ErrorResponse', '缺少文件 ID。'),
          '404': jsonResponse('ErrorResponse', '文件不存在。')
        }
      }
    },
} as const;
