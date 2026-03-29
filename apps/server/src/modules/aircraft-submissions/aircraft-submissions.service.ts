import { aircraftModelsService } from "../aircraft-models/aircraft-models.service";
import { brandsService } from "../brands/brands.service";
import { siteSettingsService } from "../site-settings/site-settings.service";
import { resolveUploadedFileUrl } from "../uploads/uploads.helpers";
import { uploadsRepo } from "../uploads/upload.repo";
import { uploadsService } from "../uploads/upload.service";
import { aircraftSubmissionsRepo } from "./aircraft-submissions.repo";

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

async function serializeSubmission(
  item: Awaited<ReturnType<typeof aircraftSubmissionsRepo.findById>>,
  approvedModelSlug: string | null
) {
  if (!item) {
    return null;
  }

  const brandRecord = item.brand;
  const hasBrand = Boolean(brandRecord && brandRecord.id && brandRecord.slug && brandRecord.name);

  const videoFile = item.videoFileId ? await uploadsRepo.getFileById(item.videoFileId) : null;

  return {
    id: item.id,
    status: item.status as "draft" | "submitted" | "approved" | "rejected",
    category: {
      id: item.category.id,
      slug: item.category.slug,
      name: item.category.name
    },
    brand: hasBrand
      ? {
          id: brandRecord!.id!,
          slug: brandRecord!.slug!,
          name: brandRecord!.name!
        }
      : null,
    proposedBrandName: item.proposedBrandName,
    modelName: item.modelName,
    powerType: item.powerType as "electric" | "fuel" | "hybrid" | "other",
    summary: item.summary,
    description: item.description,
    coverImageFileId: item.coverImageFileId ?? null,
    galleryImageFileIds: parseGallery(item.galleryImageFileIds),
    videoFileId: item.videoFileId ?? null,
    coverImageUrl: item.coverImageUrl,
    galleryImageUrls: parseGallery(item.galleryImageUrls),
    videoAsset: videoFile
      ? {
          id: videoFile.id,
          url: uploadsService.serializeFileItem(videoFile).url,
          fileName: videoFile.fileName,
          mimeType: videoFile.mimeType,
          byteSize: videoFile.byteSize
        }
      : null,
    approvedModelId: item.approvedModelId,
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

async function buildUniqueModelSlug(modelName: string) {
  const base = slugify(modelName) || "custom-model";
  let nextSlug = base;
  let suffix = 2;

  while (await aircraftModelsService.getModelDetail(nextSlug)) {
    nextSlug = `${base}-${suffix}`;
    suffix += 1;
  }

  return nextSlug;
}

async function createBrandForSubmission(categoryId: string, proposedBrandName: string) {
  const brands = await brandsService.listBrands();
  const baseSlug = slugify(proposedBrandName) || "custom-brand";
  const usedSlugs = new Set(brands.map((item) => item.slug));

  let nextSlug = baseSlug;
  let suffix = 2;
  while (usedSlugs.has(nextSlug)) {
    nextSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const createdBrand = await brandsService.createBrand({
    slug: nextSlug,
    name: proposedBrandName,
    logoUrl: null,
    categoryId,
    sortOrder: brands.length + 1,
    isEnabled: true
  });

  return createdBrand.id;
}

export const aircraftSubmissionsService = {
  async createSubmission(input: {
    authorId: string;
    categoryId: string;
    brandId: string | null;
    proposedBrandName: string | null;
    modelName: string;
    powerType: "electric" | "fuel" | "hybrid" | "other";
    summary: string | null;
    description: string | null;
    coverImageFileId: string | null;
    galleryImageFileIds: string[];
    videoFileId: string | null;
    maxFlightTimeMinutes: number | null;
    maxRangeKilometers: number | null;
    maxSpeedKph: number | null;
    takeoffWeightGrams: number | null;
  }) {
    const moderation = await siteSettingsService.getResolvedSettings();
    if (input.videoFileId) {
      const videoAsset = await aircraftSubmissionsRepo.getOwnedVideoAsset(
        input.authorId,
        input.videoFileId
      );
      if (!videoAsset) {
        return { kind: "invalid_video" as const };
      }
    }

    const coverImageUrl =
      input.coverImageFileId !== null
        ? await resolveUploadedFileUrl(input.coverImageFileId)
        : null;
    const galleryImageUrls = (
      await Promise.all(input.galleryImageFileIds.map(fileId => resolveUploadedFileUrl(fileId)))
    ).filter((value): value is string => Boolean(value));

    const item = await aircraftSubmissionsRepo.create({
      authorId: input.authorId,
      status: "submitted",
      categoryId: input.categoryId,
      brandId: input.brandId,
      proposedBrandName: input.proposedBrandName,
      modelName: input.modelName,
      powerType: input.powerType,
      summary: input.summary,
      description: input.description,
      coverImageFileId: input.coverImageFileId,
      galleryImageFileIds: JSON.stringify(input.galleryImageFileIds),
      videoFileId: input.videoFileId,
      coverImageUrl,
      galleryImageUrls: JSON.stringify(galleryImageUrls),
      maxFlightTimeMinutes: input.maxFlightTimeMinutes,
      maxRangeKilometers: input.maxRangeKilometers,
      maxSpeedKph: input.maxSpeedKph,
      takeoffWeightGrams: input.takeoffWeightGrams,
      approvedModelId: null
    });

    if (!moderation.submissionModerationEnabled && item) {
      const approved = await this.updateSubmissionStatus(item.id, "approved");
      if (!approved) {
        return { kind: "ok" as const, item: (await serializeSubmission(item, null))! };
      }

      return { kind: "ok" as const, item: approved.item };
    }

    return { kind: "ok" as const, item: (await serializeSubmission(item, null))! };
  },
  async getSubmission(id: string) {
    const item = await aircraftSubmissionsRepo.findById(id);
    if (!item) {
      return null;
    }

    const approvedModel = item.approvedModelId
      ? await aircraftModelsService.getModelDetailById(item.approvedModelId)
      : null;
    return { item: (await serializeSubmission(item, approvedModel?.slug ?? null))! };
  },
  async listAdminSubmissions() {
    const items = await aircraftSubmissionsRepo.listAdmin();
    return {
      items: await Promise.all(
        items.map(async (item) => {
          const approvedModel = item.approvedModelId
            ? await aircraftModelsService.getModelDetailById(item.approvedModelId)
            : null;
          return (await serializeSubmission(item, approvedModel?.slug ?? null))!;
        })
      )
    };
  },
  async updateSubmissionStatus(id: string, status: "approved" | "rejected") {
    const current = await aircraftSubmissionsRepo.findById(id);
    if (!current) {
      return null;
    }

    if (status === "rejected") {
      const item = await aircraftSubmissionsRepo.updateStatusOnly(id, "rejected");
      const approvedModel = item?.approvedModelId
        ? await aircraftModelsService.getModelDetailById(item.approvedModelId)
        : null;
      return { item: (await serializeSubmission(item, approvedModel?.slug ?? null))! };
    }

    if (current.status === "approved" && current.approvedModelId) {
      const approvedModel = await aircraftModelsService.getModelDetailById(current.approvedModelId);
      return { item: (await serializeSubmission(current, approvedModel?.slug ?? null))! };
    }

    let brandId = current.brandId;
    if (current.proposedBrandName && current.proposedBrandName.trim().length > 0) {
      brandId = await createBrandForSubmission(current.categoryId, current.proposedBrandName.trim());
    }

    if (!brandId) {
      throw new Error("Cannot approve submission without brandId or proposedBrandName.");
    }

    const model = await aircraftModelsService.createModel({
      slug: await buildUniqueModelSlug(current.modelName),
      name: current.modelName,
      categoryId: current.categoryId,
      brandId,
      powerType: current.powerType,
      summary: current.summary,
      description: current.description,
      maxFlightTimeMinutes: current.maxFlightTimeMinutes,
      maxRangeKilometers: current.maxRangeKilometers,
      maxSpeedKph: current.maxSpeedKph,
      takeoffWeightGrams: current.takeoffWeightGrams,
      isPublished: true
    });

    if (!model) {
      return null;
    }

    const item = await aircraftSubmissionsRepo.approveSubmission(id, model.id, brandId);
    return { item: (await serializeSubmission(item, model.slug))! };
  }
};
