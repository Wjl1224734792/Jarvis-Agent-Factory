import {
  brandApplicationResponseSchema,
  brandApplicationsResponseSchema,
  createBrandApplicationInputSchema,
  updateBrandApplicationStatusInputSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  requireAuth,
  type AuthVariables
} from "../auth/auth.middleware";
import { brandApplicationsService } from "./brand-applications.service";

export const brandApplicationsRoute = new Hono<{ Variables: AuthVariables }>();

brandApplicationsRoute.use("*", attachCurrentUser);

brandApplicationsRoute.post(API_ROUTES.brandApplications.create, requireAuth, async (context) => {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = createBrandApplicationInputSchema.parse(await context.req.json());
  const payload = await brandApplicationsService.createApplication({
    applicantId: currentUser.id,
    slug: input.slug,
    name: input.name,
    logoUrl: input.logoUrl ?? null,
    description: input.description ?? null
  });

  return context.json(brandApplicationResponseSchema.parse(payload));
});

brandApplicationsRoute.get(API_ROUTES.brandApplications.detail(":id"), requireAuth, async (context) => {
  const id = context.req.param("id");
  if (!id) {
    return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
  }

  const payload = await brandApplicationsService.getApplication(id);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "Brand application not found." }, 404);
  }

  return context.json(brandApplicationResponseSchema.parse(payload));
});

brandApplicationsRoute.get(API_ROUTES.brandApplications.adminList, requireAdmin, async (context) => {
  const payload = await brandApplicationsService.listAdminApplications();
  return context.json(brandApplicationsResponseSchema.parse(payload));
});

brandApplicationsRoute.put(
  API_ROUTES.brandApplications.adminDetail(":id"),
  requireAdmin,
  async (context) => {
    const id = context.req.param("id");
    if (!id) {
      return context.json({ code: "BAD_REQUEST", message: "Missing id." }, 400);
    }

    const input = updateBrandApplicationStatusInputSchema.parse(await context.req.json());
    const payload = await brandApplicationsService.updateStatus(id, input.status);
    if (!payload) {
      return context.json({ code: "NOT_FOUND", message: "Brand application not found." }, 404);
    }

    return context.json(brandApplicationResponseSchema.parse(payload));
  }
);
