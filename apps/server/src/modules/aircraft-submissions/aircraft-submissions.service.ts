import { aircraftSubmissionsRepo } from "./aircraft-submissions.repo";
import { aircraftModelsService } from "../aircraft-models/aircraft-models.service";
import { brandsService } from "../brands/brands.service";
import { categoriesService } from "../categories/categories.service";

const AUTO_APPROVE_SUBMISSIONS = true;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function parseGallery(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function serializeSubmission(
  item: Awaited<ReturnType<typeof aircraftSubmissionsRepo.findById>>,
  approvedModelSlug: string | null
) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    status: item.status as "draft" | "submitted" | "approved" | "rejected",
    brandName: item.brandName,
    modelName: item.modelName,
    aircraftType: item.aircraftType,
    powerType: item.powerType as "electric" | "fuel" | "hybrid",
    summary: item.summary,
    description: item.description,
    coverImageUrl: item.coverImageUrl,
    galleryImageUrls: parseGallery(item.galleryImageUrls),
    videoUrl: item.videoUrl,
    approvedModelSlug,
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      role: item.author.role as "user" | "admin"
    },
    parameters: {
      maxFlightTimeMinutes: item.maxFlightTimeMinutes,
      maxRangeKilometers: item.maxRangeKilometers,
      maxSpeedKph: item.maxSpeedKph,
      takeoffWeightGrams: item.takeoffWeightGrams
    },
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export const aircraftSubmissionsService = {
  async createSubmission(input: {
    authorId: string;
    brandName: string;
    modelName: string;
    aircraftType: string;
    powerType: "electric" | "fuel" | "hybrid" | "other";
    summary: string | null;
    description: string | null;
    coverImageUrl: string | null;
    galleryImageUrls: string[];
    videoUrl: string | null;
    maxFlightTimeMinutes: number | null;
    maxRangeKilometers: number | null;
    maxSpeedKph: number | null;
    takeoffWeightGrams: number | null;
  }) {
    let approvedModelSlug: string | null = null;
    let approvedModelId: string | null = null;
    let status: "submitted" | "approved" = "submitted";

    if (AUTO_APPROVE_SUBMISSIONS) {
      const categories = await categoriesService.listCategories();
      const brands = await brandsService.listBrands();
      const existingCategory =
        categories.find((item) => item.name === input.aircraftType) ??
        categories.find((item) => item.slug === slugify(input.aircraftType));
      const category =
        existingCategory ??
        (await categoriesService.createCategory({
          slug: slugify(input.aircraftType) || "custom-aircraft",
          name: input.aircraftType,
          sortOrder: categories.length + 1,
          isEnabled: true
        }));
      const existingBrand =
        brands.find((item) => item.name === input.brandName) ??
        brands.find((item) => item.slug === slugify(input.brandName));
      const brand =
        existingBrand ??
        (await brandsService.createBrand({
          slug: slugify(input.brandName) || "custom-brand",
          name: input.brandName,
          categoryId: category.id,
          sortOrder: brands.length + 1,
          isEnabled: true
        }));

      let nextSlug = slugify(input.modelName) || "custom-model";
      let suffix = 2;
      while (await aircraftModelsService.getModelDetail(nextSlug)) {
        nextSlug = `${slugify(input.modelName) || "custom-model"}-${suffix}`;
        suffix += 1;
      }

      const model = await aircraftModelsService.createModel({
        slug: nextSlug,
        name: input.modelName,
        categoryId: category.id,
        brandId: brand.id,
        powerType: input.powerType,
        summary: input.summary,
        description: input.description,
        maxFlightTimeMinutes: input.maxFlightTimeMinutes,
        maxRangeKilometers: input.maxRangeKilometers,
        maxSpeedKph: input.maxSpeedKph,
        takeoffWeightGrams: input.takeoffWeightGrams,
        isPublished: true
      });

      approvedModelSlug = model?.slug ?? null;
      approvedModelId = model?.id ?? null;
      status = "approved";
    }

    const item = await aircraftSubmissionsRepo.create({
      authorId: input.authorId,
      status,
      brandName: input.brandName,
      modelName: input.modelName,
      aircraftType: input.aircraftType,
      powerType: input.powerType,
      summary: input.summary,
      description: input.description,
      coverImageUrl: input.coverImageUrl,
      galleryImageUrls: JSON.stringify(input.galleryImageUrls),
      videoUrl: input.videoUrl,
      maxFlightTimeMinutes: input.maxFlightTimeMinutes,
      maxRangeKilometers: input.maxRangeKilometers,
      maxSpeedKph: input.maxSpeedKph,
      takeoffWeightGrams: input.takeoffWeightGrams,
      approvedModelId
    });

    return { item: serializeSubmission(item, approvedModelSlug)! };
  },
  async getSubmission(id: string) {
    const item = await aircraftSubmissionsRepo.findById(id);
    if (!item) {
      return null;
    }

    const approvedModel = item.approvedModelId
      ? await aircraftModelsService.getModelDetailById(item.approvedModelId)
      : null;
    return { item: serializeSubmission(item, approvedModel?.slug ?? null)! };
  },
  async listAdminSubmissions() {
    const items = await aircraftSubmissionsRepo.listAdmin();
    return {
      items: await Promise.all(
        items.map(async (item) => {
          const approvedModel = item.approvedModelId
            ? await aircraftModelsService.getModelDetailById(item.approvedModelId)
            : null;
          return serializeSubmission(item, approvedModel?.slug ?? null)!;
        })
      )
    };
  },
  async updateSubmissionStatus(
    id: string,
    status: "draft" | "submitted" | "approved" | "rejected"
  ) {
    const item = await aircraftSubmissionsRepo.updateStatus(id, status, null);
    if (!item) {
      return null;
    }

    return { item: serializeSubmission(item, null)! };
  }
};
