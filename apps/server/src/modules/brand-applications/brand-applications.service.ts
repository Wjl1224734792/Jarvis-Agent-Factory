import { brandsService } from "../brands/brands.service";
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
    status: item.status as "pending" | "approved" | "rejected" | "hidden",
    slug: item.slug,
    name: item.name,
    logoUrl: item.logoUrl ?? null,
    description: item.description ?? null,
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

async function createBrandFromApplication(input: {
  slug: string;
  name: string;
  logoUrl: string | null;
}) {
  const brands = await brandsService.listBrands();
  const requestedSlug = slugify(input.slug) || slugify(input.name) || "brand";
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
    slug: string;
    name: string;
    logoUrl: string | null;
    description: string | null;
  }) {
    const shouldModerate = await siteSettingsService.shouldModerateBrandApplication();
    const item = await brandApplicationsRepo.create({
      applicantId: input.applicantId,
      status: shouldModerate ? "pending" : "approved",
      slug: input.slug,
      name: input.name,
      logoUrl: input.logoUrl,
      description: input.description,
      approvedBrandId: null
    });

    if (!shouldModerate && item) {
      const approvedBrandId = await createBrandFromApplication({
        slug: input.slug,
        name: input.name,
        logoUrl: input.logoUrl
      });
      const approved = await brandApplicationsRepo.updateStatus(item.id, {
        status: "approved",
        approvedBrandId
      });
      return { item: (await serializeApplication(approved))! };
    }

    return { item: (await serializeApplication(item))! };
  },
  async getApplication(id: string) {
    const item = await brandApplicationsRepo.findById(id);
    if (!item) {
      return null;
    }

    return { item: (await serializeApplication(item))! };
  },
  async listAdminApplications() {
    const items = await brandApplicationsRepo.listAdmin();
    return {
      items: (
        await Promise.all(items.map((item) => serializeApplication(item)))
      ).filter((item): item is NonNullable<typeof item> => item !== null)
    };
  },
  async updateStatus(id: string, status: "approved" | "rejected" | "hidden") {
    const current = await brandApplicationsRepo.findById(id);
    if (!current) {
      return null;
    }

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
      approvedBrandId
    });

    return item ? { item: (await serializeApplication(item))! } : null;
  }
};
