import {
  aircraftSubmissionResponseSchema,
  aircraftSubmissionsResponseSchema,
  createAircraftSubmissionInputSchema,
  updateAircraftSubmissionStatusInputSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono, type Context } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  requireAuth,
  type AuthVariables
} from "../auth/auth.middleware";
import { aircraftSubmissionsService } from "./aircraft-submissions.service";

export const aircraftSubmissionsRoute = new Hono<{ Variables: AuthVariables }>();

function getCurrentUserOrUnauthorized(context: Context) {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  return currentUser;
}

function getRequiredIdOrBadRequest(context: Context) {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  return id;
}

// 机型投稿域：用户提交/编辑素材，管理员审核并驱动状态迁移。
aircraftSubmissionsRoute.use("*", attachCurrentUser);

aircraftSubmissionsRoute.post(API_ROUTES.submissions.create, requireAuth, async (context) => {
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const input = createAircraftSubmissionInputSchema.parse(await context.req.json());
  const payload = await aircraftSubmissionsService.createSubmission({
    authorId: currentUser.id,
    ...input
  });

  if (payload.kind === "invalid_video") {
    return context.json({ code: "BAD_REQUEST", message: "Invalid uploaded video asset." }, 400);
  }

  return context.json(aircraftSubmissionResponseSchema.parse({ item: payload.item }));
});

aircraftSubmissionsRoute.get(API_ROUTES.submissions.detail(":id"), requireAuth, async (context) => {
  const id = getRequiredIdOrBadRequest(context);
  if (id instanceof Response) {
    return id;
  }

  const payload = await aircraftSubmissionsService.getSubmission(id);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Submission not found." }, 404);
  }

  return context.json(aircraftSubmissionResponseSchema.parse(payload));
});

aircraftSubmissionsRoute.put(API_ROUTES.submissions.detail(":id"), requireAuth, async (context) => {
  const id = getRequiredIdOrBadRequest(context);
  if (id instanceof Response) {
    return id;
  }
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const input = createAircraftSubmissionInputSchema.parse(await context.req.json());
  const result = await aircraftSubmissionsService.updateOwnedSubmission(id, currentUser, input);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Submission not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json(aircraftSubmissionResponseSchema.parse({ item: result.item }));
});

aircraftSubmissionsRoute.delete(API_ROUTES.submissions.detail(":id"), requireAuth, async (context) => {
  const id = getRequiredIdOrBadRequest(context);
  if (id instanceof Response) {
    return id;
  }
  const currentUser = getCurrentUserOrUnauthorized(context);
  if (currentUser instanceof Response) {
    return currentUser;
  }

  const result = await aircraftSubmissionsService.deleteOwnedSubmission(id, currentUser);
  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Submission not found." }, 404);
  }
  if (result.kind === "forbidden") {
    return context.json({ code: "FORBIDDEN", message: "Not allowed." }, 403);
  }

  return context.json({ success: true });
});

aircraftSubmissionsRoute.get(API_ROUTES.submissions.adminList, requireAdmin, async (context) => {
  const payload = await aircraftSubmissionsService.listAdminSubmissions();
  return context.json(aircraftSubmissionsResponseSchema.parse(payload));
});

aircraftSubmissionsRoute.put(
  API_ROUTES.submissions.adminDetail(":id"),
  requireAdmin,
  async (context) => {
    const id = getRequiredIdOrBadRequest(context);
    if (id instanceof Response) {
      return id;
    }

    // 当状态改成 rejected 时，schema 会要求 rejectionReason 必填。
    const input = updateAircraftSubmissionStatusInputSchema.parse(await context.req.json());
    const payload = await aircraftSubmissionsService.updateSubmissionStatus(
      id,
      input.status,
      input.rejectionReason ?? null
    );
    if (!payload) {
      return context.json({ code: "NOT_FOUND", message: "Submission not found." }, 404);
    }

    return context.json(aircraftSubmissionResponseSchema.parse(payload));
  }
);
