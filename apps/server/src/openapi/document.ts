import {
  actionSuccessResponseSchema,
  adminLoginRequestSchema,
  adminRecentSessionsResponseSchema,
  adminBrandInputSchema,
  adminBrandResponseSchema,
  adminCategoryInputSchema,
  adminCategoryResponseSchema,
  adminContentCategoryInputSchema,
  adminContentCategoryResponseSchema,
  appAuthSessionResponseSchema,
  appLoginRequestSchema,
  appLoginResponseSchema,
  aircraftCategorySchema,
  aircraftSubmissionResponseSchema,
  aircraftSubmissionsResponseSchema,
  authErrorResponseSchema,
  authSuccessResponseSchema,
  brandApplicationResponseSchema,
  brandApplicationsResponseSchema,
  brandSchema,
  captchaChallengeResponseSchema,
  completeAppRegistrationRequestSchema,
  completeUploadInputSchema,
  completeUploadResponseSchema,
  completeWebRegistrationRequestSchema,
  contentCategoriesResponseSchema,
  createPostInputSchema,
  createPostResponseSchema,
  createAircraftSubmissionInputSchema,
  createBrandApplicationInputSchema,
  currentUserResponseSchema,
  currentUserProfileResponseSchema,
  errorResponseSchema,
  fileUrlResponseSchema,
  healthResponseSchema,
  initUploadInputSchema,
  initUploadResponseSchema,
  modelDetailResponseSchema,
  modelListResponseSchema,
  modelReviewsResponseSchema,
  postDetailResponseSchema,
  rankingResponseSchema,
  rankingsResponseSchema,
  smsCodeRequestSchema,
  smsCodeResponseSchema,
  notificationsResponseSchema,
  phoneChangeConfirmInputSchema,
  phoneChangeRequestInputSchema,
  phoneChangeRequestResponseSchema,
  siteSettingsResponseSchema,
  submitModelReviewInputSchema,
  submitModelReviewResponseSchema,
  updateAircraftSubmissionStatusInputSchema,
  updateBrandApplicationInputSchema,
  updateBrandApplicationStatusInputSchema,
  updateCurrentUserProfileInputSchema,
  updateSiteSettingsInputSchema,
  userContentResponseSchema,
  userProfileResponseSchema,
  webLoginRequestSchema,
  webLoginResponseSchema
} from '@feijia/schemas';
import { API_ROUTES, APP_NAME } from '@feijia/shared';
import { z } from 'zod';
import { SESSION_COOKIE_NAME } from '../modules/auth/auth.middleware';

export const OPENAPI_DOCUMENT_PATH = '/openapi.json';
export const API_DOCS_PATH = '/docs';

const API_VERSION = '0.1.0';

type JsonSchemaObject = Record<string, unknown>;

function toOpenApiSchema(schema: z.ZodTypeAny): JsonSchemaObject {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0'
  }) as JsonSchemaObject;
}

function mergeSchema(
  schema: JsonSchemaObject,
  extra: Record<string, unknown>
): JsonSchemaObject {
  return {
    ...schema,
    ...extra
  };
}

const componentSchemas = {
  HealthResponse: toOpenApiSchema(healthResponseSchema),
  ErrorResponse: toOpenApiSchema(errorResponseSchema),
  ActionSuccessResponse: toOpenApiSchema(actionSuccessResponseSchema),
  AuthErrorResponse: toOpenApiSchema(authErrorResponseSchema),
  CaptchaChallengeResponse: toOpenApiSchema(captchaChallengeResponseSchema),
  SmsCodeRequest: toOpenApiSchema(smsCodeRequestSchema),
  SmsCodeResponse: toOpenApiSchema(smsCodeResponseSchema),
  WebLoginRequest: toOpenApiSchema(webLoginRequestSchema),
  WebLoginResponse: toOpenApiSchema(webLoginResponseSchema),
  AppLoginRequest: toOpenApiSchema(appLoginRequestSchema),
  AppLoginResponse: toOpenApiSchema(appLoginResponseSchema),
  AppAuthSessionResponse: toOpenApiSchema(appAuthSessionResponseSchema),
  CompleteWebRegistrationRequest: toOpenApiSchema(
    completeWebRegistrationRequestSchema
  ),
  CompleteAppRegistrationRequest: toOpenApiSchema(
    completeAppRegistrationRequestSchema
  ),
  AdminLoginRequest: toOpenApiSchema(adminLoginRequestSchema),
  AuthSuccessResponse: toOpenApiSchema(authSuccessResponseSchema),
  CurrentUserResponse: toOpenApiSchema(currentUserResponseSchema),
  CurrentUserProfileResponse: toOpenApiSchema(currentUserProfileResponseSchema),
  UpdateCurrentUserProfileRequest: mergeSchema(
    toOpenApiSchema(updateCurrentUserProfileInputSchema),
    {
      minProperties: 1
    }
  ),
  PhoneChangeRequest: toOpenApiSchema(phoneChangeRequestInputSchema),
  PhoneChangeRequestResponse: toOpenApiSchema(phoneChangeRequestResponseSchema),
  PhoneChangeConfirmRequest: toOpenApiSchema(phoneChangeConfirmInputSchema),
  NotificationsResponse: toOpenApiSchema(notificationsResponseSchema),
  UserProfileResponse: toOpenApiSchema(userProfileResponseSchema),
  UserContentResponse: toOpenApiSchema(userContentResponseSchema),
  FileUrlResponse: toOpenApiSchema(fileUrlResponseSchema),
  AdminRecentSessionsResponse: toOpenApiSchema(
    adminRecentSessionsResponseSchema
  ),
  InitUploadRequest: toOpenApiSchema(initUploadInputSchema),
  InitUploadResponse: toOpenApiSchema(initUploadResponseSchema),
  CompleteUploadRequest: toOpenApiSchema(completeUploadInputSchema),
  CompleteUploadResponse: toOpenApiSchema(completeUploadResponseSchema),
  CreateBrandApplicationRequest: toOpenApiSchema(createBrandApplicationInputSchema),
  UpdateBrandApplicationRequest: toOpenApiSchema(updateBrandApplicationInputSchema),
  UpdateBrandApplicationStatusRequest: toOpenApiSchema(
    updateBrandApplicationStatusInputSchema
  ),
  BrandApplicationResponse: toOpenApiSchema(brandApplicationResponseSchema),
  BrandApplicationsResponse: toOpenApiSchema(brandApplicationsResponseSchema),
  CreateAircraftSubmissionRequest: toOpenApiSchema(
    createAircraftSubmissionInputSchema
  ),
  UpdateAircraftSubmissionStatusRequest: toOpenApiSchema(
    updateAircraftSubmissionStatusInputSchema
  ),
  AircraftSubmissionResponse: toOpenApiSchema(aircraftSubmissionResponseSchema),
  AircraftSubmissionsResponse: toOpenApiSchema(
    aircraftSubmissionsResponseSchema
  ),
  ContentCategoriesResponse: toOpenApiSchema(contentCategoriesResponseSchema),
  AdminContentCategoryRequest: toOpenApiSchema(adminContentCategoryInputSchema),
  AdminContentCategoryResponse: toOpenApiSchema(
    adminContentCategoryResponseSchema
  ),
  AircraftCategoryListResponse: toOpenApiSchema(z.array(aircraftCategorySchema)),
  AdminCategoryRequest: toOpenApiSchema(adminCategoryInputSchema),
  AdminCategoryResponse: toOpenApiSchema(adminCategoryResponseSchema),
  BrandListResponse: toOpenApiSchema(z.array(brandSchema)),
  AdminBrandRequest: toOpenApiSchema(adminBrandInputSchema),
  AdminBrandResponse: toOpenApiSchema(adminBrandResponseSchema),
  SiteSettingsResponse: toOpenApiSchema(siteSettingsResponseSchema),
  UpdateSiteSettingsRequest: mergeSchema(
    toOpenApiSchema(updateSiteSettingsInputSchema),
    {
      minProperties: 1
    }
  ),
  CreatePostRequest: toOpenApiSchema(createPostInputSchema),
  CreatePostResponse: toOpenApiSchema(createPostResponseSchema),
  PostDetailResponse: toOpenApiSchema(postDetailResponseSchema),
  ModelListResponse: toOpenApiSchema(modelListResponseSchema),
  ModelDetailResponse: toOpenApiSchema(modelDetailResponseSchema),
  ModelReviewsResponse: toOpenApiSchema(modelReviewsResponseSchema),
  SubmitModelReviewRequest: toOpenApiSchema(submitModelReviewInputSchema),
  SubmitModelReviewResponse: toOpenApiSchema(submitModelReviewResponseSchema),
  RankingsResponse: toOpenApiSchema(rankingsResponseSchema),
  RankingResponse: toOpenApiSchema(rankingResponseSchema)
};

function schemaRef(name: keyof typeof componentSchemas) {
  return {
    $ref: `#/components/schemas/${name}`
  };
}

function jsonRequestBody(
  schemaName: keyof typeof componentSchemas,
  description: string,
  required = true
) {
  return {
    description,
    required,
    content: {
      'application/json': {
        schema: schemaRef(schemaName)
      }
    }
  };
}

function jsonResponse(
  schemaName: keyof typeof componentSchemas,
  description: string
) {
  return {
    description,
    content: {
      'application/json': {
        schema: schemaRef(schemaName)
      }
    }
  };
}

function stringPathParameter(name: string, description: string) {
  return {
    name,
    in: 'path',
    required: true,
    description,
    schema: {
      type: 'string'
    }
  };
}

function stringQueryParameter(name: string, description: string) {
  return {
    name,
    in: 'query',
    required: false,
    description,
    schema: {
      type: 'string'
    }
  };
}

const sessionCookieSecurity = [{ sessionCookieAuth: [] }];
const bearerSecurity = [{ bearerAuth: [] }];
const optionalSessionCookieSecurity = [{}, { sessionCookieAuth: [] }];
const optionalBearerSecurity = [{}, { bearerAuth: [] }];
const optionalSessionOrBearerSecurity = [
  {},
  { sessionCookieAuth: [] },
  { bearerAuth: [] }
];
const sessionOrBearerSecurity = [
  { sessionCookieAuth: [] },
  { bearerAuth: [] }
];
const adminSessionSecurity = [{ sessionCookieAuth: [] }];

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: `${APP_NAME} API`,
    version: API_VERSION,
    description:
      '飞加服务端的第一版 OpenAPI 文档，优先覆盖健康检查、认证、上传和核心内容接口。文档会先保证已描述接口可信，再逐步扩展覆盖范围。'
  },
  servers: [
    {
      url: '/',
      description: '当前运行中的服务端实例'
    }
  ],
  tags: [
    {
      name: 'system',
      description: '系统健康检查与服务可用性接口'
    },
    {
      name: 'auth',
      description: '验证码、登录、注册和会话相关接口'
    },
    {
      name: 'uploads',
      description: '两阶段文件上传与文件地址查询接口'
    },
    {
      name: 'models',
      description: '机型列表、详情和评测相关接口'
    },
    {
      name: 'posts',
      description: '帖子创建与详情接口'
    },
    {
      name: 'rankings',
      description: '榜单列表与详情接口'
    },
    {
      name: 'social',
      description: '用户资料、关注关系和通知接口'
    },
    {
      name: 'brand-applications',
      description: '品牌申请提交与后台审核接口'
    },
    {
      name: 'submissions',
      description: '飞行器投稿提交与后台审核接口'
    },
    {
      name: 'catalog',
      description: '分类、品牌和内容分类等基础资料接口'
    },
    {
      name: 'settings',
      description: '后台站点配置接口'
    }
  ],
  components: {
    securitySchemes: {
      sessionCookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: SESSION_COOKIE_NAME,
        description: 'Web 与管理端通过会话 Cookie 访问的鉴权方式。'
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Session Token',
        description: 'App 端通过 Authorization: Bearer <token> 访问的鉴权方式。'
      }
    },
    schemas: componentSchemas
  },
  paths: {
    [API_ROUTES.health]: {
      get: {
        tags: ['system'],
        summary: '健康检查',
        description: '返回服务状态、时间戳与版本号，供探活与联调使用。',
        responses: {
          '200': jsonResponse('HealthResponse', '服务可用。')
        }
      }
    },
    [API_ROUTES.auth.captchaChallenge]: {
      post: {
        tags: ['auth'],
        summary: '申请图形验证码挑战',
        responses: {
          '200': jsonResponse('CaptchaChallengeResponse', '验证码挑战已生成。')
        }
      }
    },
    [API_ROUTES.auth.smsRequest]: {
      post: {
        tags: ['auth'],
        summary: '申请短信验证码',
        requestBody: jsonRequestBody(
          'SmsCodeRequest',
          '手机号与图形验证码校验参数。'
        ),
        responses: {
          '200': jsonResponse('SmsCodeResponse', '短信验证码已发送或生成模拟码。'),
          '400': jsonResponse('AuthErrorResponse', '图形验证码或手机号校验失败。'),
          '503': jsonResponse('AuthErrorResponse', '短信供应商暂时不可用。')
        }
      }
    },
    [API_ROUTES.auth.webLogin]: {
      post: {
        tags: ['auth'],
        summary: 'Web 端登录',
        requestBody: jsonRequestBody(
          'WebLoginRequest',
          'Web 登录所需的手机号、图形验证码和短信验证码。'
        ),
        responses: {
          '200': jsonResponse('WebLoginResponse', '返回已登录结果或注册补全信息。'),
          '400': jsonResponse('AuthErrorResponse', '登录参数错误或验证码无效。'),
          '409': jsonResponse('AuthErrorResponse', '账号状态冲突，例如手机号已注册。')
        }
      }
    },
    [API_ROUTES.auth.webRegisterComplete]: {
      post: {
        tags: ['auth'],
        summary: '补全 Web 端注册信息',
        requestBody: jsonRequestBody(
          'CompleteWebRegistrationRequest',
          '使用 registrationToken 补充昵称和头像。'
        ),
        responses: {
          '200': jsonResponse('AuthSuccessResponse', '注册完成并返回当前用户。'),
          '400': jsonResponse('AuthErrorResponse', '注册 token 或昵称不合法。'),
          '409': jsonResponse('AuthErrorResponse', '昵称或手机号存在冲突。')
        }
      }
    },
    [API_ROUTES.auth.appLogin]: {
      post: {
        tags: ['auth'],
        summary: 'App 端登录',
        requestBody: jsonRequestBody(
          'AppLoginRequest',
          'App 登录请求，支持携带 deviceLabel。'
        ),
        responses: {
          '200': jsonResponse('AppLoginResponse', '返回已登录结果或注册补全信息。'),
          '400': jsonResponse('AuthErrorResponse', '登录参数错误或验证码无效。')
        }
      }
    },
    [API_ROUTES.auth.appRegisterComplete]: {
      post: {
        tags: ['auth'],
        summary: '补全 App 端注册信息',
        requestBody: jsonRequestBody(
          'CompleteAppRegistrationRequest',
          'App 注册补全请求，会返回 accessToken 与 refreshToken。'
        ),
        responses: {
          '200': jsonResponse('AppAuthSessionResponse', '注册完成并返回 App 会话。'),
          '400': jsonResponse('AuthErrorResponse', '注册 token 或昵称不合法。'),
          '409': jsonResponse('AuthErrorResponse', '昵称或手机号存在冲突。')
        }
      }
    },
    [API_ROUTES.auth.adminLogin]: {
      post: {
        tags: ['auth'],
        summary: '管理端登录',
        requestBody: jsonRequestBody(
          'AdminLoginRequest',
          '管理端账号密码登录请求。'
        ),
        responses: {
          '200': jsonResponse('AuthSuccessResponse', '登录成功并写入会话 Cookie。'),
          '400': jsonResponse('AuthErrorResponse', '账号或密码错误。')
        }
      }
    },
    [API_ROUTES.auth.currentUser]: {
      get: {
        tags: ['auth'],
        summary: '获取当前 Web 会话用户',
        security: optionalSessionCookieSecurity,
        responses: {
          '200': jsonResponse(
            'CurrentUserResponse',
            '返回当前会话用户，未登录时 user 为 null。'
          )
        }
      }
    },
    [API_ROUTES.auth.appCurrentUser]: {
      get: {
        tags: ['auth'],
        summary: '获取当前 App 会话用户',
        security: optionalBearerSecurity,
        responses: {
          '200': jsonResponse(
            'CurrentUserResponse',
            '返回当前 Bearer token 对应的用户。'
          )
        }
      }
    },
    [API_ROUTES.auth.adminSessions]: {
      get: {
        tags: ['auth'],
        summary: '查看最近登录会话',
        security: sessionCookieSecurity,
        responses: {
          '200': jsonResponse(
            'AdminRecentSessionsResponse',
            '返回管理端可见的最近登录会话。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
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
          '按需增量更新个人资料，至少提交一个字段。'
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
    [API_ROUTES.brandApplications.create]: {
      post: {
        tags: ['brand-applications'],
        summary: '提交品牌申请',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'CreateBrandApplicationRequest',
          '提交品牌申请资料。'
        ),
        responses: {
          '200': jsonResponse(
            'BrandApplicationResponse',
            '品牌申请创建成功。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。')
        }
      }
    },
    [API_ROUTES.brandApplications.detail('{id}')]: {
      get: {
        tags: ['brand-applications'],
        summary: '查看品牌申请详情',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '品牌申请 ID。')],
        responses: {
          '200': jsonResponse(
            'BrandApplicationResponse',
            '返回品牌申请详情。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '404': jsonResponse('ErrorResponse', '品牌申请不存在。')
        }
      },
      put: {
        tags: ['brand-applications'],
        summary: '更新品牌申请',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '品牌申请 ID。')],
        requestBody: jsonRequestBody(
          'UpdateBrandApplicationRequest',
          '更新自己提交的品牌申请。'
        ),
        responses: {
          '200': jsonResponse(
            'BrandApplicationResponse',
            '品牌申请已更新。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '无权更新该申请。'),
          '404': jsonResponse('ErrorResponse', '品牌申请不存在。')
        }
      }
    },
    [API_ROUTES.brandApplications.adminList]: {
      get: {
        tags: ['brand-applications'],
        summary: '管理端查看品牌申请列表',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse(
            'BrandApplicationsResponse',
            '返回全部品牌申请。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.brandApplications.adminDetail('{id}')]: {
      put: {
        tags: ['brand-applications'],
        summary: '管理端审核品牌申请',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '品牌申请 ID。')],
        requestBody: jsonRequestBody(
          'UpdateBrandApplicationStatusRequest',
          '更新品牌申请状态；当 status 为 rejected 时必须提供 rejectionReason。'
        ),
        responses: {
          '200': jsonResponse(
            'BrandApplicationResponse',
            '品牌申请状态已更新。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '品牌申请不存在。')
        }
      }
    },
    [API_ROUTES.submissions.create]: {
      post: {
        tags: ['submissions'],
        summary: '提交飞行器投稿',
        security: sessionOrBearerSecurity,
        requestBody: jsonRequestBody(
          'CreateAircraftSubmissionRequest',
          '提交机型投稿的基础资料、媒体和参数。'
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
          '404': jsonResponse('ErrorResponse', '投稿不存在。')
        }
      },
      put: {
        tags: ['submissions'],
        summary: '更新自己的飞行器投稿',
        security: sessionOrBearerSecurity,
        parameters: [stringPathParameter('id', '投稿 ID。')],
        requestBody: jsonRequestBody(
          'CreateAircraftSubmissionRequest',
          '更新已提交的投稿内容。'
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
    [API_ROUTES.content.categories]: {
      get: {
        tags: ['catalog'],
        summary: '查看启用中的内容分类',
        responses: {
          '200': jsonResponse(
            'ContentCategoriesResponse',
            '返回可用于内容发布的分类列表。'
          )
        }
      }
    },
    [API_ROUTES.content.adminCategories]: {
      get: {
        tags: ['catalog'],
        summary: '管理端查看全部内容分类',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse(
            'ContentCategoriesResponse',
            '返回全部内容分类。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      },
      post: {
        tags: ['catalog'],
        summary: '管理端创建内容分类',
        security: adminSessionSecurity,
        requestBody: jsonRequestBody(
          'AdminContentCategoryRequest',
          '创建内容分类。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminContentCategoryResponse',
            '内容分类创建成功。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.content.adminCategoryDetail('{id}')]: {
      put: {
        tags: ['catalog'],
        summary: '管理端更新内容分类',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '内容分类 ID。')],
        requestBody: jsonRequestBody(
          'AdminContentCategoryRequest',
          '更新内容分类。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminContentCategoryResponse',
            '内容分类已更新。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少内容分类 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '内容分类不存在。')
        }
      }
    },
    [API_ROUTES.models.categories]: {
      get: {
        tags: ['catalog'],
        summary: '查看机型分类列表',
        responses: {
          '200': jsonResponse(
            'AircraftCategoryListResponse',
            '返回机型分类列表。'
          )
        }
      },
      post: {
        tags: ['catalog'],
        summary: '管理端创建机型分类',
        security: adminSessionSecurity,
        requestBody: jsonRequestBody(
          'AdminCategoryRequest',
          '创建机型分类。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminCategoryResponse',
            '机型分类创建成功。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.models.adminCategoryDetail('{id}')]: {
      put: {
        tags: ['catalog'],
        summary: '管理端更新机型分类',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '机型分类 ID。')],
        requestBody: jsonRequestBody(
          'AdminCategoryRequest',
          '更新机型分类。'
        ),
        responses: {
          '200': jsonResponse(
            'AdminCategoryResponse',
            '机型分类已更新。'
          ),
          '400': jsonResponse('ErrorResponse', '缺少机型分类 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '机型分类不存在。')
        }
      }
    },
    [API_ROUTES.models.brands]: {
      get: {
        tags: ['catalog'],
        summary: '查看品牌列表',
        responses: {
          '200': jsonResponse('BrandListResponse', '返回品牌列表。')
        }
      },
      post: {
        tags: ['catalog'],
        summary: '管理端创建品牌',
        security: adminSessionSecurity,
        requestBody: jsonRequestBody(
          'AdminBrandRequest',
          '创建品牌。'
        ),
        responses: {
          '200': jsonResponse('AdminBrandResponse', '品牌创建成功。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.models.adminBrandDetail('{id}')]: {
      put: {
        tags: ['catalog'],
        summary: '管理端更新品牌',
        security: adminSessionSecurity,
        parameters: [stringPathParameter('id', '品牌 ID。')],
        requestBody: jsonRequestBody(
          'AdminBrandRequest',
          '更新品牌。'
        ),
        responses: {
          '200': jsonResponse('AdminBrandResponse', '品牌已更新。'),
          '400': jsonResponse('ErrorResponse', '缺少品牌 ID。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '404': jsonResponse('ErrorResponse', '品牌不存在。')
        }
      }
    },
    [API_ROUTES.admin.siteSettings]: {
      get: {
        tags: ['settings'],
        summary: '查看站点设置',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse(
            'SiteSettingsResponse',
            '返回当前站点设置。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      },
      put: {
        tags: ['settings'],
        summary: '更新站点设置',
        security: adminSessionSecurity,
        requestBody: jsonRequestBody(
          'UpdateSiteSettingsRequest',
          '按需更新站点设置，至少提交一个字段。'
        ),
        responses: {
          '200': jsonResponse(
            'SiteSettingsResponse',
            '站点设置已更新。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。'),
          '500': jsonResponse('ErrorResponse', '站点设置更新失败。')
        }
      }
    },
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
      }
    },
    [API_ROUTES.rankings.overview]: {
      get: {
        tags: ['rankings'],
        summary: '查询榜单列表',
        responses: {
          '200': jsonResponse('RankingsResponse', '返回官方与社区榜单列表。')
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
  }
} as const;
