import {
  actionSuccessResponseSchema,
  adminAnalyticsOverviewResponseSchema,
  adminModelCommentResponseSchema,
  adminModelCommentsResponseSchema,
  adminModelInputSchema,
  adminModelResponseSchema,
  adminLoginRequestSchema,
  adminOfficialArticleUpdateInputSchema,
  adminPostCommentResponseSchema,
  adminPostCommentsResponseSchema,
  adminPostCommentStatusUpdateInputSchema,
  adminPostResponseSchema,
  adminPostStatusUpdateInputSchema,
  adminRecentSessionsResponseSchema,
  adminBrandInputSchema,
  adminBrandResponseSchema,
  adminCategoryInputSchema,
  adminCategoryResponseSchema,
  adminContentCategoryInputSchema,
  adminContentCategoryResponseSchema,
  adminRankingCommentResponseSchema,
  adminRankingCommentsResponseSchema,
  adminRatingTargetCommentResponseSchema,
  adminRatingTargetCommentsResponseSchema,
  adminPostsResponseSchema,
  adminRankingsResponseSchema,
  adminReportRecordsResponseSchema,
  adminReviewCommentResponseSchema,
  adminReviewCommentsResponseSchema,
  adminReviewResponseSchema,
  adminReviewsResponseSchema,
  appAuthSessionResponseSchema,
  appLoginRequestSchema,
  appLoginResponseSchema,
  appRefreshRequestSchema,
  aircraftCategorySchema,
  createModelCommentInputSchema,
  createModelCommentResponseSchema,
  aircraftSubmissionResponseSchema,
  aircraftSubmissionsResponseSchema,
  authErrorResponseSchema,
  authSuccessResponseSchema,
  brandApplicationResponseSchema,
  brandApplicationsResponseSchema,
  brandSchema,
  captchaChallengeResponseSchema,
  circleFeedResponseSchema,
  completeAppRegistrationRequestSchema,
  completeUploadInputSchema,
  completeUploadResponseSchema,
  completeWebRegistrationRequestSchema,
  contentCategoriesResponseSchema,
  createPostCommentInputSchema,
  createPostCommentResponseSchema,
  createPostInputSchema,
  createPostResponseSchema,
  createAircraftSubmissionInputSchema,
  createBrandApplicationInputSchema,
  createRankingInputSchema,
  addRatingTargetInputSchema,
  createRatingTargetCommentInputSchema,
  createRatingTargetCommentResponseSchema,
  createRankingCommentInputSchema,
  createRankingCommentResponseSchema,
  createReviewCommentInputSchema,
  createReviewCommentResponseSchema,
  currentUserResponseSchema,
  currentUserProfileResponseSchema,
  errorResponseSchema,
  fileUrlResponseSchema,
  healthResponseSchema,
  homeFeedResponseSchema,
  initUploadInputSchema,
  initUploadResponseSchema,
  modelDetailResponseSchema,
  modelCommentsResponseSchema,
  modelInteractionResponseSchema,
  modelListResponseSchema,
  modelReviewsResponseSchema,
  postDetailResponseSchema,
  ratingTargetDetailResponseSchema,
  ratingTargetResponseSchema,
  rankingResponseSchema,
  rankingsResponseSchema,
  registrationDisplayNameSuggestRequestSchema,
  registrationDisplayNameSuggestResponseSchema,
  reportContentInputSchema,
  reviewCommentsResponseSchema,
  smsCodeRequestSchema,
  smsCodeResponseSchema,
  notificationsResponseSchema,
  phoneChangeConfirmInputSchema,
  phoneChangeRequestInputSchema,
  phoneChangeRequestResponseSchema,
  siteSettingsResponseSchema,
  submitRatingTargetRatingInputSchema,
  submitRatingTargetRatingResponseSchema,
  submitRatingTargetReviewInputSchema,
  submitRatingTargetReviewResponseSchema,
  submitModelReviewInputSchema,
  submitModelReviewResponseSchema,
  updateModelCommentInputSchema,
  updateModelCommentStatusInputSchema,
  updateAircraftSubmissionStatusInputSchema,
  updateBrandApplicationInputSchema,
  updateBrandApplicationStatusInputSchema,
  updateCurrentUserProfileInputSchema,
  updatePostCommentInputSchema,
  updatePostInputSchema,
  updateRankingCommentStatusInputSchema,
  updateRatingTargetCommentInputSchema,
  updateRatingTargetCommentStatusInputSchema,
  updateRatingTargetStatusInputSchema,
  updateRankingStatusInputSchema,
  updateRankingInputSchema,
  updateReviewCommentInputSchema,
  updateReviewCommentStatusInputSchema,
  updateReviewStatusInputSchema,
  updateSiteSettingsInputSchema,
  userContentResponseSchema,
  userProfileResponseSchema,
  webLoginRequestSchema,
  webLoginResponseSchema
} from '@feijia/schemas';
import { API_ROUTES, APP_NAME } from '@feijia/shared';
import { z } from 'zod';

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
  RegistrationDisplayNameSuggestRequest: toOpenApiSchema(
    registrationDisplayNameSuggestRequestSchema
  ),
  RegistrationDisplayNameSuggestResponse: toOpenApiSchema(
    registrationDisplayNameSuggestResponseSchema
  ),
  AppLoginRequest: toOpenApiSchema(appLoginRequestSchema),
  AppLoginResponse: toOpenApiSchema(appLoginResponseSchema),
  AppAuthSessionResponse: toOpenApiSchema(appAuthSessionResponseSchema),
  AppRefreshRequest: toOpenApiSchema(appRefreshRequestSchema),
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
  PingResponse: toOpenApiSchema(
    z.object({
      message: z.string().min(1)
    })
  ),
  NotificationsResponse: toOpenApiSchema(notificationsResponseSchema),
  UserProfileResponse: toOpenApiSchema(userProfileResponseSchema),
  UserContentResponse: toOpenApiSchema(userContentResponseSchema),
  AdminAnalyticsOverviewResponse: toOpenApiSchema(
    adminAnalyticsOverviewResponseSchema
  ),
  AdminReportRecordsResponse: toOpenApiSchema(adminReportRecordsResponseSchema),
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
  HomeFeedResponse: toOpenApiSchema(homeFeedResponseSchema),
  CircleFeedResponse: toOpenApiSchema(circleFeedResponseSchema),
  CreatePostRequest: toOpenApiSchema(createPostInputSchema),
  CreatePostResponse: toOpenApiSchema(createPostResponseSchema),
  UpdatePostRequest: toOpenApiSchema(updatePostInputSchema),
  CreatePostCommentRequest: toOpenApiSchema(createPostCommentInputSchema),
  CreatePostCommentResponse: toOpenApiSchema(createPostCommentResponseSchema),
  UpdatePostCommentRequest: toOpenApiSchema(updatePostCommentInputSchema),
  ReportContentRequest: toOpenApiSchema(reportContentInputSchema),
  AdminPostsResponse: toOpenApiSchema(adminPostsResponseSchema),
  AdminPostStatusUpdateRequest: toOpenApiSchema(adminPostStatusUpdateInputSchema),
  AdminPostResponse: toOpenApiSchema(adminPostResponseSchema),
  AdminOfficialArticleUpdateRequest: toOpenApiSchema(
    adminOfficialArticleUpdateInputSchema
  ),
  AdminPostCommentsResponse: toOpenApiSchema(adminPostCommentsResponseSchema),
  AdminPostCommentStatusUpdateRequest: toOpenApiSchema(
    adminPostCommentStatusUpdateInputSchema
  ),
  AdminPostCommentResponse: toOpenApiSchema(adminPostCommentResponseSchema),
  PostDetailResponse: toOpenApiSchema(postDetailResponseSchema),
  ModelListResponse: toOpenApiSchema(modelListResponseSchema),
  ModelDetailResponse: toOpenApiSchema(modelDetailResponseSchema),
  ModelCommentsResponse: toOpenApiSchema(modelCommentsResponseSchema),
  CreateModelCommentRequest: toOpenApiSchema(createModelCommentInputSchema),
  CreateModelCommentResponse: toOpenApiSchema(createModelCommentResponseSchema),
  UpdateModelCommentRequest: toOpenApiSchema(updateModelCommentInputSchema),
  ModelInteractionResponse: toOpenApiSchema(modelInteractionResponseSchema),
  AdminModelRequest: toOpenApiSchema(adminModelInputSchema),
  AdminModelResponse: toOpenApiSchema(adminModelResponseSchema),
  AdminModelCommentsResponse: toOpenApiSchema(adminModelCommentsResponseSchema),
  UpdateModelCommentStatusRequest: toOpenApiSchema(
    updateModelCommentStatusInputSchema
  ),
  AdminModelCommentResponse: toOpenApiSchema(adminModelCommentResponseSchema),
  ModelReviewsResponse: toOpenApiSchema(modelReviewsResponseSchema),
  SubmitModelReviewRequest: toOpenApiSchema(submitModelReviewInputSchema),
  SubmitModelReviewResponse: toOpenApiSchema(submitModelReviewResponseSchema),
  ReviewCommentsResponse: toOpenApiSchema(reviewCommentsResponseSchema),
  CreateReviewCommentRequest: toOpenApiSchema(createReviewCommentInputSchema),
  CreateReviewCommentResponse: toOpenApiSchema(createReviewCommentResponseSchema),
  AdminReviewsResponse: toOpenApiSchema(adminReviewsResponseSchema),
  UpdateReviewStatusRequest: toOpenApiSchema(updateReviewStatusInputSchema),
  AdminReviewResponse: toOpenApiSchema(adminReviewResponseSchema),
  UpdateReviewCommentRequest: toOpenApiSchema(updateReviewCommentInputSchema),
  AdminReviewCommentsResponse: toOpenApiSchema(adminReviewCommentsResponseSchema),
  UpdateReviewCommentStatusRequest: toOpenApiSchema(
    updateReviewCommentStatusInputSchema
  ),
  AdminReviewCommentResponse: toOpenApiSchema(adminReviewCommentResponseSchema),
  CreateRankingRequest: toOpenApiSchema(createRankingInputSchema),
  UpdateRankingRequest: toOpenApiSchema(updateRankingInputSchema),
  AdminRankingsResponse: toOpenApiSchema(adminRankingsResponseSchema),
  UpdateRankingStatusRequest: toOpenApiSchema(updateRankingStatusInputSchema),
  UpdateRatingTargetStatusRequest: toOpenApiSchema(
    updateRatingTargetStatusInputSchema
  ),
  AdminRankingCommentsResponse: toOpenApiSchema(
    adminRankingCommentsResponseSchema
  ),
  UpdateRankingCommentStatusRequest: toOpenApiSchema(
    updateRankingCommentStatusInputSchema
  ),
  AdminRankingCommentResponse: toOpenApiSchema(
    adminRankingCommentResponseSchema
  ),
  AdminRatingTargetCommentsResponse: toOpenApiSchema(
    adminRatingTargetCommentsResponseSchema
  ),
  UpdateRatingTargetCommentStatusRequest: toOpenApiSchema(
    updateRatingTargetCommentStatusInputSchema
  ),
  AdminRatingTargetCommentResponse: toOpenApiSchema(
    adminRatingTargetCommentResponseSchema
  ),
  AddRatingTargetRequest: toOpenApiSchema(addRatingTargetInputSchema),
  RatingTargetResponse: toOpenApiSchema(ratingTargetResponseSchema),
  RatingTargetDetailResponse: toOpenApiSchema(ratingTargetDetailResponseSchema),
  CreateRankingCommentRequest: toOpenApiSchema(createRankingCommentInputSchema),
  CreateRankingCommentResponse: toOpenApiSchema(
    createRankingCommentResponseSchema
  ),
  CreateRatingTargetCommentRequest: toOpenApiSchema(
    createRatingTargetCommentInputSchema
  ),
  UpdateRatingTargetCommentRequest: toOpenApiSchema(
    updateRatingTargetCommentInputSchema
  ),
  CreateRatingTargetCommentResponse: toOpenApiSchema(
    createRatingTargetCommentResponseSchema
  ),
  SubmitRatingTargetRatingRequest: toOpenApiSchema(
    submitRatingTargetRatingInputSchema
  ),
  SubmitRatingTargetRatingResponse: toOpenApiSchema(
    submitRatingTargetRatingResponseSchema
  ),
  SubmitRatingTargetReviewRequest: toOpenApiSchema(
    submitRatingTargetReviewInputSchema
  ),
  SubmitRatingTargetReviewResponse: toOpenApiSchema(
    submitRatingTargetReviewResponseSchema
  ),
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
    },
    {
      name: 'admin-analytics',
      description: '后台概览统计与运营分析接口'
    },
    {
      name: 'admin-reports',
      description: '后台举报详情与审核证据查询接口'
    },
    {
      name: 'reviews',
      description: '机型评测评论、互动与后台审核接口'
    }
  ],
  components: {
    securitySchemes: {
      sessionCookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'feijia_access',
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
    [API_ROUTES.auth.registrationDisplayNameSuggest]: {
      post: {
        tags: ['auth'],
        summary: '刷新注册昵称建议',
        requestBody: jsonRequestBody(
          'RegistrationDisplayNameSuggestRequest',
          '基于 registrationToken 生成新的可用昵称。'
        ),
        responses: {
          '200': jsonResponse(
            'RegistrationDisplayNameSuggestResponse',
            '返回新的昵称建议。'
          ),
          '400': jsonResponse('AuthErrorResponse', '注册 token 无效或已过期。')
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
    [API_ROUTES.auth.adminCurrentUser]: {
      get: {
        tags: ['auth'],
        summary: '获取当前管理端会话用户',
        security: optionalSessionCookieSecurity,
        responses: {
          '200': jsonResponse(
            'CurrentUserResponse',
            '返回当前管理端用户，非管理员或未登录时 user 为 null。'
          )
        }
      }
    },
    [API_ROUTES.auth.logout]: {
      post: {
        tags: ['auth'],
        summary: '退出 Web 会话',
        security: optionalSessionCookieSecurity,
        responses: {
          '200': jsonResponse('CurrentUserResponse', '退出成功，user 为空。')
        }
      }
    },
    [API_ROUTES.auth.appLogout]: {
      post: {
        tags: ['auth'],
        summary: '退出 App 会话',
        security: optionalBearerSecurity,
        responses: {
          '200': jsonResponse('CurrentUserResponse', '退出成功，user 为空。')
        }
      }
    },
    [API_ROUTES.auth.appRefresh]: {
      post: {
        tags: ['auth'],
        summary: '刷新 App 会话令牌',
        requestBody: jsonRequestBody(
          'AppRefreshRequest',
          '提交 refreshToken 换取新的 accessToken。'
        ),
        responses: {
          '200': jsonResponse('AppAuthSessionResponse', '返回新的 App 会话。'),
          '400': jsonResponse('AuthErrorResponse', 'refreshToken 无效或已过期。')
        }
      }
    },
    [API_ROUTES.auth.adminLogout]: {
      post: {
        tags: ['auth'],
        summary: '退出管理端会话',
        security: optionalSessionCookieSecurity,
        responses: {
          '200': jsonResponse('CurrentUserResponse', '退出成功，user 为空。')
        }
      }
    },
    [API_ROUTES.auth.protectedPing]: {
      get: {
        tags: ['auth'],
        summary: '校验普通登录态',
        security: sessionOrBearerSecurity,
        responses: {
          '200': jsonResponse('PingResponse', '返回用户态 pong。'),
          '401': jsonResponse('ErrorResponse', '未登录。')
        }
      }
    },
    [API_ROUTES.auth.adminProtectedPing]: {
      get: {
        tags: ['auth'],
        summary: '校验管理员登录态',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse('PingResponse', '返回管理员态 pong。'),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
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
    [API_ROUTES.admin.analyticsOverview]: {
      get: {
        tags: ['admin-analytics'],
        summary: '获取后台概览统计',
        security: adminSessionSecurity,
        responses: {
          '200': jsonResponse(
            'AdminAnalyticsOverviewResponse',
            '返回注册、活跃、内容和审核概览。'
          ),
          '401': jsonResponse('ErrorResponse', '未登录。'),
          '403': jsonResponse('ErrorResponse', '非管理员会话。')
        }
      }
    },
    [API_ROUTES.admin.reportDetail('{kind}', '{id}')]: {
      get: {
        tags: ['admin-reports'],
        summary: '获取举报明细',
        security: adminSessionSecurity,
        parameters: [
          {
            name: 'kind',
            in: 'path',
            required: true,
            description: '举报目标类型。',
            schema: {
              type: 'string',
              enum: [
                'post',
                'model',
                'review',
                'post-comment',
                'review-comment',
                'model-comment',
                'ranking',
                'ranking-item',
                'ranking-comment',
                'ranking-item-comment'
              ]
            }
          },
          stringPathParameter('id', '举报目标 ID。')
        ],
        responses: {
          '200': jsonResponse(
            'AdminReportRecordsResponse',
            '返回该目标下的举报记录与证据。'
          ),
          '400': jsonResponse('ErrorResponse', '举报类型或目标 ID 不合法。'),
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
  }
} as const;
