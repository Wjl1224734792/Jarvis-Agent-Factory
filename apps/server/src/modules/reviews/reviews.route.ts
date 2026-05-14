import {
  actionSuccessResponseSchema,
  adminReportRecordsResponseSchema,
  adminReviewCommentResponseSchema,
  adminReviewCommentsResponseSchema,
  adminReviewResponseSchema,
  adminReviewsResponseSchema,
  createReviewCommentInputSchema,
  createReviewCommentResponseSchema,
  modelReviewsResponseSchema,
  reportContentInputSchema,
  reviewCommentsResponseSchema,
  submitModelReviewInputSchema,
  submitModelReviewResponseSchema,
  updateReviewCommentInputSchema,
  updateReviewCommentStatusInputSchema,
  updateReviewStatusInputSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAuth,
  requireRole,
  type AuthVariables
} from "../auth/auth.middleware";
import { reviewsService } from "./reviews.service";

export const reviewsRoute = new Hono<{ Variables: AuthVariables }>();

function parsePositiveInt(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

// 评测接口同时包含公开浏览、用户互动和后台审核三类场景，先统一注入当前用户上下文。
reviewsRoute.use('*', attachCurrentUser);

reviewsRoute.get(API_ROUTES.models.reviews(":slug"), async (context) => {
  const slug = context.req.param("slug");

  if (!slug) {
    return context.json({ code: "BAD_REQUEST", message: "Missing slug." }, 400);
  }

  const currentUser = context.get("currentUser");
  const payload = await reviewsService.listModelReviews(slug, currentUser?.id, {
    page: parsePositiveInt(context.req.query("page")),
    limit: parsePositiveInt(context.req.query("limit"))
  });

  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Model not found." }, 404);
  }

  return context.json(modelReviewsResponseSchema.parse(payload));
});

reviewsRoute.post(API_ROUTES.models.reviews(":slug"), requireAuth, async (context) => {
  const slug = context.req.param("slug");

  if (!slug) {
    return context.json({ code: "BAD_REQUEST", message: "Missing slug." }, 400);
  }

  const currentUser = context.get("currentUser");

  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = submitModelReviewInputSchema.parse(await context.req.json());
  const payload = await reviewsService.submitReview(slug, currentUser.id, input);

  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Model not found." }, 404);
  }

  return context.json(submitModelReviewResponseSchema.parse(payload));
});

// 后台审核接口放在前半段，前台评论与点赞举报接口放在后半段，便于按职责浏览。
reviewsRoute.get(API_ROUTES.models.adminReviews, requireRole('super_admin', 'editor'), async (context) => {
  const payload = await reviewsService.listAdminReviews();
  return context.json(adminReviewsResponseSchema.parse(payload));
});

reviewsRoute.put(API_ROUTES.models.adminReviewDetail(":id"), requireRole('super_admin', 'editor'), async (context) => {
  const id = context.req.param("id");

  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const input = updateReviewStatusInputSchema.parse(await context.req.json());
  const item = await reviewsService.updateReviewStatus(id, input.status);

  if (!item) {
    return context.json({ code: "NOT_FOUND", message: "Review not found." }, 404);
  }

  return context.json(adminReviewResponseSchema.parse({ item }));
});

reviewsRoute.get(API_ROUTES.models.adminReviewReports(":id"), requireRole('super_admin', 'editor'), async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await reviewsService.listReviewReports(id);
  return context.json(adminReportRecordsResponseSchema.parse(payload));
});

reviewsRoute.get(API_ROUTES.models.adminReviewComments, requireRole('super_admin', 'editor'), async (context) => {
  const status = context.req.query("status");
  const payload = await reviewsService.listAdminReviewComments(
    status === "pending" || status === "visible" || status === "hidden" ? status : undefined
  );
  return context.json(adminReviewCommentsResponseSchema.parse(payload));
});

reviewsRoute.put(API_ROUTES.models.adminReviewCommentDetail(":id"), requireRole('super_admin', 'editor'), async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const input = updateReviewCommentStatusInputSchema.parse(await context.req.json());
  const item = await reviewsService.updateReviewCommentStatus(id, input.status);
  if (!item) {
    return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
  }

  return context.json(adminReviewCommentResponseSchema.parse({ item }));
});

reviewsRoute.get(API_ROUTES.models.adminReviewCommentReports(":id"), requireRole('super_admin', 'editor'), async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await reviewsService.listReviewCommentReports(id);
  return context.json(adminReportRecordsResponseSchema.parse(payload));
});

reviewsRoute.get(API_ROUTES.models.reviewComments(":reviewId"), async (context) => {
  const reviewId = context.req.param("reviewId");

  if (!reviewId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing review id." }, 400);
  }

  const payload = await reviewsService.listReviewComments(
    reviewId,
    context.get("currentUser")?.id
  );
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Review not found." }, 404);
  }

  return context.json(reviewCommentsResponseSchema.parse(payload));
});

reviewsRoute.post(API_ROUTES.models.reviewComments(":reviewId"), requireAuth, async (context) => {
  const reviewId = context.req.param("reviewId");
  const currentUser = context.get("currentUser");

  if (!reviewId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing review id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = createReviewCommentInputSchema.parse(await context.req.json());
  const result = await reviewsService.createReviewComment(reviewId, currentUser, input);

  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Review or comment not found." }, 404);
  }

  return context.json(createReviewCommentResponseSchema.parse({ item: result.item }));
});

reviewsRoute.delete(
  API_ROUTES.models.reviewCommentDetail(":reviewId", ":commentId"),
  requireAuth,
  async (context) => {
    const reviewId = context.req.param("reviewId");
    const commentId = context.req.param("commentId");
    const currentUser = context.get("currentUser");

    if (!reviewId || !commentId) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }
    if (!currentUser) {
      return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
    }

    const result = await reviewsService.deleteReviewComment(reviewId, commentId, currentUser);
    if (result.kind === "not_found") {
      return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
    }
    if (result.kind === "forbidden") {
      return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
    }

    return context.json(actionSuccessResponseSchema.parse({ success: true }));
  }
);

reviewsRoute.post(API_ROUTES.models.reviewLike(":reviewId"), requireAuth, async (context) => {
  const reviewId = context.req.param("reviewId");
  const currentUser = context.get("currentUser");

  if (!reviewId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing review id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const result = await reviewsService.toggleReviewLike(reviewId, currentUser);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Review not found." }, 404);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

reviewsRoute.post(API_ROUTES.models.reviewReport(":reviewId"), requireAuth, async (context) => {
  const reviewId = context.req.param("reviewId");
  const currentUser = context.get("currentUser");

  if (!reviewId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing review id." }, 400);
  }
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = reportContentInputSchema.parse(await context.req.json());
  const result = await reviewsService.reportReview(reviewId, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Review not found." }, 404);
  }
  if (result.kind === "invalid_images") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid report evidence images." }, 400);
  }

  return context.json(actionSuccessResponseSchema.parse({ success: true }));
});

reviewsRoute.put(
  API_ROUTES.models.reviewCommentDetail(":reviewId", ":commentId"),
  requireAuth,
  async (context) => {
    const reviewId = context.req.param("reviewId");
    const commentId = context.req.param("commentId");
    const currentUser = context.get("currentUser");

    if (!reviewId || !commentId) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }
    if (!currentUser) {
      return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
    }

    const input = updateReviewCommentInputSchema.parse(await context.req.json());
    const result = await reviewsService.updateReviewComment(reviewId, commentId, currentUser, input);
    if (result.kind === "not_found") {
      return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
    }
    if (result.kind === "forbidden") {
      return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
    }

    return context.json(createReviewCommentResponseSchema.parse({ item: result.item }));
  }
);

reviewsRoute.post(
  API_ROUTES.models.reviewCommentLike(":reviewId", ":commentId"),
  requireAuth,
  async (context) => {
    const reviewId = context.req.param("reviewId");
    const commentId = context.req.param("commentId");
    const currentUser = context.get("currentUser");

    if (!reviewId || !commentId) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }
    if (!currentUser) {
      return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
    }

    const result = await reviewsService.toggleReviewCommentLike(reviewId, commentId, currentUser);
    if (result.kind === "not_found") {
      return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
    }

    return context.json(actionSuccessResponseSchema.parse({ success: true }));
  }
);

reviewsRoute.post(
  API_ROUTES.models.reviewCommentReport(":reviewId", ":commentId"),
  requireAuth,
  async (context) => {
    const reviewId = context.req.param("reviewId");
    const commentId = context.req.param("commentId");
    const currentUser = context.get("currentUser");

    if (!reviewId || !commentId) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }
    if (!currentUser) {
      return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
    }

    const input = reportContentInputSchema.parse(await context.req.json());
    const result = await reviewsService.reportReviewComment(
      reviewId,
      commentId,
      currentUser,
      input
    );
    if (result.kind === "not_found") {
      return context.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
    }
    if (result.kind === "invalid_images") {
      return context.json({ code: "BAD_REQUEST", message: "Invalid report evidence images." }, 400);
    }

    return context.json(actionSuccessResponseSchema.parse({ success: true }));
  }
);
