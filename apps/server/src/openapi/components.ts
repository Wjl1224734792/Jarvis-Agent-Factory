import {
  actionSuccessResponseSchema,
  adminAnalyticsOverviewResponseSchema,
  adminMessageListResponseSchema,
  adminModerationTodosResponseSchema,
  adminModelCommentResponseSchema,
  adminModelCommentsResponseSchema,
  adminModelInputSchema,
  adminModelResponseSchema,
  adminLoginRequestSchema,
  adminPasswordChangeRequestSchema,
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
  deviceRegisterInputSchema,
  deviceRegisterResponseSchema,
  deviceUnregisterInputSchema,
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
  paginationMetaSchema,
  paginationQuerySchema,
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
import { z } from 'zod';

import { mergeSchema, toOpenApiSchema } from './builders';

export const componentSchemas = {
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
  AdminPasswordChangeRequest: toOpenApiSchema(adminPasswordChangeRequestSchema),
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
  AdminMessageListResponse: toOpenApiSchema(adminMessageListResponseSchema),
  AdminModerationTodosResponse: toOpenApiSchema(adminModerationTodosResponseSchema),
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
  UpdateAircraftSubmissionRequest: toOpenApiSchema(
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
  RankingResponse: toOpenApiSchema(rankingResponseSchema),
  PaginationQuery: toOpenApiSchema(paginationQuerySchema),
  PaginationMeta: toOpenApiSchema(paginationMetaSchema),
  DeviceRegisterRequest: toOpenApiSchema(deviceRegisterInputSchema),
  DeviceRegisterResponse: toOpenApiSchema(deviceRegisterResponseSchema),
  DeviceUnregisterRequest: toOpenApiSchema(deviceUnregisterInputSchema)
} as const;
