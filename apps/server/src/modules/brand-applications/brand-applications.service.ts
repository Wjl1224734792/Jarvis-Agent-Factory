import { brandsService } from "../brands/brands.service";
import { evaluateTextModeration } from "../audits/text-moderation.service";
import { socialService } from "../social/social.service";
import { siteSettingsService } from "../site-settings/site-settings.service";
import { brandApplicationsRepo } from "./brand-applications.repo";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function serializeApplication(
  item: Awaited<ReturnType<typeof brandApplicationsRepo.findById>>
) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    status: item.status as "pending" | "approved" | "rejected",
    slug: item.slug,
    name: item.name,
    logoUrl: item.logoUrl ?? null,
    description: item.description ?? null,
    rejectionReason: item.rejectionReason ?? null,
    approvedBrandId: item.approvedBrandId ?? null,
    applicant: {
      id: item.applicant.id,
      displayName: item.applicant.displayName,
      avatarUrl: null,
      role: item.applicant.role as "user" | "admin"
    },
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

async function serializeApplicationOrThrow(
  item: Awaited<ReturnType<typeof brandApplicationsRepo.findById>>
) {
  const serialized = await serializeApplication(item);
  if (!serialized) {
    throw new Error("Brand application serialization failed: application not found.");
  }
  return serialized;
}

async function createBrandFromApplication(input: {
  slug: string | null;
  name: string;
  logoUrl: string | null;
}) {
  const brands = await brandsService.listBrands();
  const requestedSlug = slugify(input.slug ?? "") || slugify(input.name) || "brand";
  const usedSlugs = new Set(brands.map((item) => item.slug));
  let nextSlug = requestedSlug;
  let suffix = 2;
  while (usedSlugs.has(nextSlug)) {
    nextSlug = `${requestedSlug}-${suffix}`;
    suffix += 1;
  }

  const created = await brandsService.createBrand({
    slug: nextSlug,
    name: input.name,
    logoUrl: input.logoUrl,
    categoryId: null,
    sortOrder: brands.length + 1,
    isEnabled: true
  });

  return created.id;
}

export const brandApplicationsService = {
  async createApplication(input: {
    applicantId: string;
    slug: string | null;
    name: string;
    logoUrl: string | null;
    description: string | null;
  }) {
    const item = await brandApplicationsRepo.create({
      applicantId: input.applicantId,
      status: "pending",
      slug: input.slug,
      name: input.name,
      logoUrl: input.logoUrl,
      description: input.description,
      rejectionReason: null,
      approvedBrandId: null
    });

    if (item) {
      const moderation = await evaluateTextModeration({
        mode: await siteSettingsService.getBrandModerationMode(),
        domain: "brand_application",
        entityId: item.id,
        text: `${input.name}\n${input.description ?? ""}`
      });
      if (moderation.action === "approve") {
        const approved = await this.updateStatus(item.id, "approved");
        if (approved) {
          return approved;
        }
      }
      if (moderation.action === "reject") {
        const rejected = await this.updateStatus(item.id, "rejected", moderation.rejectionReason);
        if (rejected) {
          return rejected;
        }
      }
    }

    return { item: await serializeApplicationOrThrow(item) };
  },
  async getApplication(id: string) {
    const item = await brandApplicationsRepo.findById(id);
    if (!item) {
      return null;
    }

    return { item: await serializeApplicationOrThrow(item) };
  },
  async updateApplication(
    id: string,
    currentUser: { id: string; role: "user" | "admin" },
    input: {
      slug: string | null;
      name: string;
      logoUrl: string | null;
      description: string | null;
    }
  ) {
    const current = await brandApplicationsRepo.findById(id);
    if (!current) {
      return { kind: "not_found" as const };
    }

    if (current.applicant.id !== currentUser.id && currentUser.role !== "admin") {
      return { kind: "forbidden" as const };
    }

    const nextStatus = currentUser.role === "admin" ? current.status : "pending";
    const updated = await brandApplicationsRepo.update(id, {
      status: nextStatus,
      slug: input.slug,
      name: input.name,
      logoUrl: input.logoUrl,
      description: input.description,
      rejectionReason: null
    });

    if (!updated) {
      return { kind: "not_found" as const };
    }

    if (currentUser.role !== "admin") {
      const moderation = await evaluateTextModeration({
        mode: await siteSettingsService.getBrandModerationMode(),
        domain: "brand_application",
        entityId: updated.id,
        text: `${input.name}\n${input.description ?? ""}`
      });
      if (moderation.action === "approve") {
        const approved = await this.updateStatus(updated.id, "approved");
        if (approved) {
          return { kind: "ok" as const, payload: approved };
        }
      }
      if (moderation.action === "reject") {
        const rejected = await this.updateStatus(updated.id, "rejected", moderation.rejectionReason);
        if (rejected) {
          return { kind: "ok" as const, payload: rejected };
        }
      }
    }

    return { kind: "ok" as const, payload: { item: await serializeApplicationOrThrow(updated) } };
  },
  async listAdminApplications() {
    const items = await brandApplicationsRepo.listAdmin();
    return {
      items: (
        await Promise.all(items.map((item) => serializeApplication(item)))
      ).filter((item): item is NonNullable<typeof item> => item !== null)
    };
  },
  async updateStatus(
    id: string,
    status: "approved" | "rejected",
    rejectionReason?: string | null
  ) {
    const current = await brandApplicationsRepo.findById(id);
    if (!current) {
      return null;
    }
    const previousStatus = current.status;

    let approvedBrandId = current.approvedBrandId ?? null;
    if (status === "approved" && !approvedBrandId) {
      approvedBrandId = await createBrandFromApplication({
        slug: current.slug,
        name: current.name,
        logoUrl: current.logoUrl ?? null
      });
    }

    const item = await brandApplicationsRepo.updateStatus(id, {
      status,
      approvedBrandId,
      rejectionReason: status === "rejected" ? rejectionReason ?? null : null
    });

    if (item && previousStatus !== status) {
      const statusLabel = status === "approved" ? "已通过" : "未通过审核";
      await socialService.recordSystemNotification({
        userId: current.applicant.id,
        type: "brand_application_audit_result",
        title: status === "approved" ? "品牌申请审核通过" : "品牌申请状态更新",
        summary: `品牌申请《${current.name}》当前状态：${statusLabel}`,
        target: {
          type: "brand_application",
          id: current.id,
          title: current.name,
          status,
          href: `/brand-applications/${current.id}`
        },
        metadata: {
          fromStatus: previousStatus,
          toStatus: status,
          approvedBrandId: approvedBrandId ?? null,
          rejectionReason: status === "rejected" ? rejectionReason ?? null : null
        }
      });
    }

    return item ? { item: await serializeApplicationOrThrow(item) } : null;
  }
};
