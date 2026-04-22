import { aircraftModelsService } from "../aircraft-models/aircraft-models.service";
import { brandsService } from "../brands/brands.service";
import { evaluateTextModeration } from "../audits/text-moderation.service";
import { socialService } from "../social/social.service";
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
    const parsed: unknown = JSON.parse(value);
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
  const brand =
    hasBrand && brandRecord
      ? {
          id: brandRecord.id,
          slug: brandRecord.slug,
          name: brandRecord.name
        }
      : null;

  const videoFile = item.videoFileId ? await uploadsRepo.getFileById(item.videoFileId) : null;

  return {
    id: item.id,
    status: item.status as "draft" | "submitted" | "approved" | "rejected",
    category: {
      id: item.category.id,
      slug: item.category.slug,
      name: item.category.name
    },
    brand,
    proposedBrandName: item.proposedBrandName,
    modelName: item.modelName,
    powerType: item.powerType as "electric" | "fuel" | "hybrid" | "other",
    lifecycleStatus: item.lifecycleStatus as "concept" | "development" | "testing" | "unreleased" | "released" | "not_in_market" | "marketed",
    summary: item.summary,
    description: item.description,
    priceMin: item.priceMin,
    priceMax: item.priceMax,
    rejectionReason: item.rejectionReason ?? null,
    coverImageFileId: item.coverImageFileId ?? null,
    galleryImageFileIds: parseGallery(item.galleryImageFileIds),
    videoFileId: item.videoFileId ?? null,
    coverImageUrl: await resolveUploadedFileUrl(item.coverImageFileId ?? null),
    galleryImageUrls: (
      await Promise.all(
        parseGallery(item.galleryImageFileIds).map((fileId) => resolveUploadedFileUrl(fileId))
      )
    ).filter((value): value is string => Boolean(value)),
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

async function serializeSubmissionOrThrow(
  item: Awaited<ReturnType<typeof aircraftSubmissionsRepo.findById>>,
  approvedModelSlug: string | null
) {
  const serialized = await serializeSubmission(item, approvedModelSlug);
  if (!serialized) {
    throw new Error("Submission serialization failed: submission not found.");
  }
  return serialized;
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

async function syncApprovedModelVisibility(
  modelId: string,
  input: {
    categoryId: string;
    brandId: string;
    authorId: string;
    submissionId: string;
    modelName: string;
    powerType: "electric" | "fuel" | "hybrid" | "other";
    lifecycleStatus: "concept" | "development" | "testing" | "unreleased" | "released" | "not_in_market" | "marketed";
    summary: string | null;
    description: string | null;
    priceMin: number | null;
    priceMax: number | null;
    maxFlightTimeMinutes: number | null;
    maxRangeKilometers: number | null;
    maxSpeedKph: number | null;
    takeoffWeightGrams: number | null;
    coverImageFileId: string | null;
    galleryImageFileIds: string[];
    videoFileId: string | null;
    isPublished: boolean;
  }
) {
  const existingModel = await aircraftModelsService.getModelDetailById(modelId);
  if (!existingModel) {
    return null;
  }

  return aircraftModelsService.updateModel(modelId, {
    slug: existingModel.slug,
    name: input.modelName,
    categoryId: input.categoryId,
    brandId: input.brandId,
    ownerId: input.authorId,
    sourceSubmissionId: input.submissionId,
    powerType: input.powerType,
    lifecycleStatus: input.lifecycleStatus,
    summary: input.summary,
    description: input.description,
    priceMin: input.priceMin,
    priceMax: input.priceMax,
    maxFlightTimeMinutes: input.maxFlightTimeMinutes,
    maxRangeKilometers: input.maxRangeKilometers,
    maxSpeedKph: input.maxSpeedKph,
    takeoffWeightGrams: input.takeoffWeightGrams,
    coverImageFileId: input.coverImageFileId,
    galleryImageFileIds: input.galleryImageFileIds,
    videoFileId: input.videoFileId,
    isPublished: input.isPublished
  });
}

export const aircraftSubmissionsService = {
  async createSubmission(input: {
    authorId: string;
    categoryId: string;
    brandId: string | null;
    proposedBrandName: string | null;
    modelName: string;
    powerType: "electric" | "fuel" | "hybrid" | "other";
    lifecycleStatus: "concept" | "development" | "testing" | "unreleased" | "released" | "not_in_market" | "marketed";
    summary: string | null;
    description: string | null;
    priceMin: number | null;
    priceMax: number | null;
    coverImageFileId: string | null;
    galleryImageFileIds: string[];
    videoFileId: string | null;
    maxFlightTimeMinutes: number | null;
    maxRangeKilometers: number | null;
    maxSpeedKph: number | null;
    takeoffWeightGrams: number | null;
  }) {
    if (input.videoFileId) {
      const videoAsset = await aircraftSubmissionsRepo.getOwnedVideoAsset(
        input.authorId,
        input.videoFileId
      );
      if (!videoAsset) {
        return { kind: "invalid_video" as const };
      }
    }

    const item = await aircraftSubmissionsRepo.create({
      authorId: input.authorId,
      status: "submitted",
      categoryId: input.categoryId,
      brandId: input.brandId,
      proposedBrandName: input.proposedBrandName,
      modelName: input.modelName,
      powerType: input.powerType,
      lifecycleStatus: input.lifecycleStatus,
      summary: input.summary,
      description: input.description,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      rejectionReason: null,
      coverImageFileId: input.coverImageFileId,
      galleryImageFileIds: JSON.stringify(input.galleryImageFileIds),
      videoFileId: input.videoFileId,
      maxFlightTimeMinutes: input.maxFlightTimeMinutes,
      maxRangeKilometers: input.maxRangeKilometers,
      maxSpeedKph: input.maxSpeedKph,
      takeoffWeightGrams: input.takeoffWeightGrams,
      approvedModelId: null
    });

    if (item) {
      const moderation = await evaluateTextModeration({
        mode: await siteSettingsService.getModelSubmissionModerationMode(),
        domain: "aircraft_submission",
        entityId: item.id,
        text: [
          input.proposedBrandName ?? "",
          input.modelName,
          input.summary ?? "",
          input.description ?? ""
        ].filter(Boolean).join("\n")
      });
      if (moderation.action === "approve") {
        const approved = await this.updateSubmissionStatus(item.id, "approved");
        if (!approved) {
          return { kind: "ok" as const, item: await serializeSubmissionOrThrow(item, null) };
        }

        return { kind: "ok" as const, item: approved.item };
      }
      if (moderation.action === "reject") {
        const rejected = await this.updateSubmissionStatus(
          item.id,
          "rejected",
          moderation.rejectionReason
        );
        if (rejected) {
          return { kind: "ok" as const, item: rejected.item };
        }
      }
    }

    return { kind: "ok" as const, item: await serializeSubmissionOrThrow(item, null) };
  },
  async getSubmission(
    id: string,
    currentUser: { id: string; role: "user" | "admin" }
  ) {
    const item = await aircraftSubmissionsRepo.findById(id);
    if (!item) {
      return { kind: "not_found" as const };
    }

    const canView = currentUser.role === "admin" || item.author.id === currentUser.id;
    if (!canView) {
      return { kind: "forbidden" as const };
    }

    const approvedModel = item.approvedModelId
      ? await aircraftModelsService.getModelDetailById(item.approvedModelId)
      : null;
    return {
      kind: "ok" as const,
      payload: { item: await serializeSubmissionOrThrow(item, approvedModel?.slug ?? null) }
    };
  },
  async listAdminSubmissions() {
    const items = await aircraftSubmissionsRepo.listAdmin();
    return {
      items: await Promise.all(
        items.map(async (item) => {
          const approvedModel = item.approvedModelId
            ? await aircraftModelsService.getModelDetailById(item.approvedModelId)
            : null;
          return serializeSubmissionOrThrow(item, approvedModel?.slug ?? null);
        })
      )
    };
  },
  async updateOwnedSubmission(
    id: string,
    currentUser: { id: string; role: "user" | "admin" },
    input: {
      categoryId: string;
      brandId: string | null;
      proposedBrandName: string | null;
      modelName: string;
      powerType: "electric" | "fuel" | "hybrid" | "other";
      lifecycleStatus: "concept" | "development" | "testing" | "unreleased" | "released" | "not_in_market" | "marketed";
      summary: string | null;
      description: string | null;
      priceMin: number | null;
      priceMax: number | null;
      coverImageFileId: string | null;
      galleryImageFileIds: string[];
      videoFileId: string | null;
      maxFlightTimeMinutes: number | null;
      maxRangeKilometers: number | null;
      maxSpeedKph: number | null;
      takeoffWeightGrams: number | null;
    }
  ) {
    const current = await aircraftSubmissionsRepo.findById(id);
    if (!current) {
      return { kind: "not_found" as const };
    }

    const canEdit = currentUser.role === "admin" || current.author.id === currentUser.id;
    if (!canEdit) {
      return { kind: "forbidden" as const };
    }

    const moderationMode =
      currentUser.role === "admin"
        ? null
        : await siteSettingsService.getModelSubmissionModerationMode();
    const nextStatus = currentUser.role === "admin" ? current.status : "submitted";

    const updated = await aircraftSubmissionsRepo.updateContent(id, {
      status: nextStatus,
      categoryId: input.categoryId,
      brandId: input.brandId,
      proposedBrandName: input.proposedBrandName,
      modelName: input.modelName,
      powerType: input.powerType,
      summary: input.summary,
      description: input.description,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      rejectionReason: null,
      coverImageFileId: input.coverImageFileId,
      galleryImageFileIds: JSON.stringify(input.galleryImageFileIds),
      videoFileId: input.videoFileId,
      maxFlightTimeMinutes: input.maxFlightTimeMinutes,
      maxRangeKilometers: input.maxRangeKilometers,
      maxSpeedKph: input.maxSpeedKph,
      takeoffWeightGrams: input.takeoffWeightGrams
    });

    if (current.approvedModelId && input.brandId) {
      await syncApprovedModelVisibility(current.approvedModelId, {
        categoryId: input.categoryId,
        brandId: input.brandId,
        authorId: current.author.id,
        submissionId: id,
        modelName: input.modelName,
        powerType: input.powerType,
        lifecycleStatus: input.lifecycleStatus,
        summary: input.summary,
        description: input.description,
        priceMin: input.priceMin,
        priceMax: input.priceMax,
        maxFlightTimeMinutes: input.maxFlightTimeMinutes,
        maxRangeKilometers: input.maxRangeKilometers,
        maxSpeedKph: input.maxSpeedKph,
        takeoffWeightGrams: input.takeoffWeightGrams,
        coverImageFileId: input.coverImageFileId,
        galleryImageFileIds: input.galleryImageFileIds,
        videoFileId: input.videoFileId,
        isPublished: nextStatus === "approved"
      });
    }

    if (updated && currentUser.role !== "admin" && moderationMode) {
      const moderation = await evaluateTextModeration({
        mode: moderationMode,
        domain: "aircraft_submission",
        entityId: updated.id,
        text: [
          input.proposedBrandName ?? "",
          input.modelName,
          input.summary ?? "",
          input.description ?? ""
        ].filter(Boolean).join("\n")
      });
      if (moderation.action === "approve") {
        const approved = await this.updateSubmissionStatus(updated.id, "approved");
        if (approved) {
          return { kind: "ok" as const, item: approved.item };
        }
      }
      if (moderation.action === "reject") {
        const rejected = await this.updateSubmissionStatus(updated.id, "rejected", moderation.rejectionReason);
        if (rejected) {
          return { kind: "ok" as const, item: rejected.item };
        }
      }
    }

    const approvedModel = updated?.approvedModelId
      ? await aircraftModelsService.getModelDetailById(updated.approvedModelId)
      : null;
    return {
      kind: "ok" as const,
      item: await serializeSubmissionOrThrow(updated, approvedModel?.slug ?? null)
    };
  },
  async deleteOwnedSubmission(
    id: string,
    currentUser: { id: string; role: "user" | "admin" }
  ) {
    const current = await aircraftSubmissionsRepo.findById(id);
    if (!current) {
      return { kind: "not_found" as const };
    }

    const canDelete = currentUser.role === "admin" || current.author.id === currentUser.id;
    if (!canDelete) {
      return { kind: "forbidden" as const };
    }

    if (current.approvedModelId) {
      const model = await aircraftModelsService.getModelDetailById(current.approvedModelId);
      if (model?.ownerId === current.author.id) {
        await aircraftModelsService.deleteModel(current.approvedModelId);
      }
    }

    await aircraftSubmissionsRepo.delete(id);
    return { kind: "ok" as const };
  },
  async updateSubmissionStatus(
    id: string,
    status: "approved" | "rejected",
    rejectionReason?: string | null
  ) {
    const current = await aircraftSubmissionsRepo.findById(id);
    if (!current) {
      return null;
    }
    const previousStatus = current.status;

    if (status === "rejected") {
      if (current.approvedModelId && current.brandId) {
        await syncApprovedModelVisibility(current.approvedModelId, {
          categoryId: current.categoryId,
          brandId: current.brandId,
          authorId: current.author.id,
          submissionId: current.id,
          modelName: current.modelName,
          powerType: current.powerType as "electric" | "fuel" | "hybrid" | "other",
          lifecycleStatus: current.lifecycleStatus as "concept" | "development" | "testing" | "unreleased" | "released" | "not_in_market" | "marketed",
          summary: current.summary,
          description: current.description,
          priceMin: current.priceMin,
          priceMax: current.priceMax,
          maxFlightTimeMinutes: current.maxFlightTimeMinutes,
          maxRangeKilometers: current.maxRangeKilometers,
          maxSpeedKph: current.maxSpeedKph,
          takeoffWeightGrams: current.takeoffWeightGrams,
          coverImageFileId: current.coverImageFileId ?? null,
          galleryImageFileIds: parseGallery(current.galleryImageFileIds),
          videoFileId: current.videoFileId ?? null,
          isPublished: false
        });
      }

      const item = await aircraftSubmissionsRepo.updateStatusOnly(
        id,
        "rejected",
        rejectionReason ?? null
      );
      if (item && previousStatus !== "rejected") {
        await socialService.recordSystemNotification({
          userId: current.author.id,
          type: "aircraft_submission_audit_result",
          title: "机型投稿审核未通过",
          summary: `机型投稿《${current.modelName}》未通过审核`,
          target: {
            type: "aircraft_submission",
            id: current.id,
            title: current.modelName,
            status: "rejected",
            href: `/aircraft-submissions/${current.id}`
          },
          metadata: {
            fromStatus: previousStatus,
            toStatus: "rejected",
            rejectionReason: rejectionReason ?? null
          }
        });
      }
      const approvedModel = item?.approvedModelId
        ? await aircraftModelsService.getModelDetailById(item.approvedModelId)
        : null;
      return { item: await serializeSubmissionOrThrow(item, approvedModel?.slug ?? null) };
    }

    let brandId = current.brandId;
    if (current.proposedBrandName && current.proposedBrandName.trim().length > 0) {
      brandId = await createBrandForSubmission(current.categoryId, current.proposedBrandName.trim());
    }

    if (!brandId) {
      throw new Error("Cannot approve submission without brandId or proposedBrandName.");
    }

    if (current.approvedModelId) {
      const model = await syncApprovedModelVisibility(current.approvedModelId, {
        categoryId: current.categoryId,
        brandId,
        authorId: current.author.id,
        submissionId: current.id,
        modelName: current.modelName,
        powerType: current.powerType as "electric" | "fuel" | "hybrid" | "other",
        lifecycleStatus: current.lifecycleStatus as "concept" | "development" | "testing" | "unreleased" | "released" | "not_in_market" | "marketed",
        summary: current.summary,
        description: current.description,
        priceMin: current.priceMin,
        priceMax: current.priceMax,
        maxFlightTimeMinutes: current.maxFlightTimeMinutes,
        maxRangeKilometers: current.maxRangeKilometers,
        maxSpeedKph: current.maxSpeedKph,
        takeoffWeightGrams: current.takeoffWeightGrams,
        coverImageFileId: current.coverImageFileId ?? null,
        galleryImageFileIds: parseGallery(current.galleryImageFileIds),
        videoFileId: current.videoFileId ?? null,
        isPublished: true
      });
      const item = await aircraftSubmissionsRepo.approveSubmission(id, current.approvedModelId, brandId);
      if (item && previousStatus !== "approved") {
        await socialService.recordSystemNotification({
          userId: current.author.id,
          type: "aircraft_submission_audit_result",
          title: "机型投稿审核通过",
          summary: `机型投稿《${current.modelName}》已通过审核`,
          target: {
            type: "aircraft_submission",
            id: current.id,
            title: current.modelName,
            status: "approved",
            href: `/aircraft-submissions/${current.id}`
          },
          metadata: {
            fromStatus: previousStatus,
            toStatus: "approved",
            approvedModelId: item.approvedModelId ?? null
          }
        });
      }
      return { item: await serializeSubmissionOrThrow(item, model?.slug ?? null) };
    }

    const model = await aircraftModelsService.createModel({
      slug: await buildUniqueModelSlug(current.modelName),
      name: current.modelName,
      categoryId: current.categoryId,
      brandId,
      ownerId: current.author.id,
      sourceSubmissionId: current.id,
      powerType: current.powerType,
      lifecycleStatus: current.lifecycleStatus as "concept" | "development" | "testing" | "unreleased" | "released" | "not_in_market" | "marketed",
      summary: current.summary,
      description: current.description,
      priceMin: current.priceMin,
      priceMax: current.priceMax,
      maxFlightTimeMinutes: current.maxFlightTimeMinutes,
      maxRangeKilometers: current.maxRangeKilometers,
      maxSpeedKph: current.maxSpeedKph,
      takeoffWeightGrams: current.takeoffWeightGrams,
      coverImageFileId: current.coverImageFileId ?? null,
      galleryImageFileIds: parseGallery(current.galleryImageFileIds),
      videoFileId: current.videoFileId ?? null,
      isPublished: true
    });

    if (!model) {
      return null;
    }

    const item = await aircraftSubmissionsRepo.approveSubmission(id, model.id, brandId);
    if (item && previousStatus !== "approved") {
      await socialService.recordSystemNotification({
        userId: current.author.id,
        type: "aircraft_submission_audit_result",
        title: "机型投稿审核通过",
        summary: `机型投稿《${current.modelName}》已通过审核`,
        target: {
          type: "aircraft_submission",
          id: current.id,
          title: current.modelName,
          status: "approved",
          href: `/aircraft-submissions/${current.id}`
        },
        metadata: {
          fromStatus: previousStatus,
          toStatus: "approved",
          approvedModelId: item.approvedModelId ?? null
        }
      });
    }
    return { item: await serializeSubmissionOrThrow(item, model.slug) };
  }
};
