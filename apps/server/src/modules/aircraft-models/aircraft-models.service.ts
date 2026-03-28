import { categoriesService } from "../categories/categories.service";
import { brandsService } from "../brands/brands.service";
import { aircraftModelsRepo } from "./aircraft-models.repo";

type ListFilters = {
  categorySlug?: string;
  brandSlug?: string;
  powerTypes?: string[];
};

export const aircraftModelsService = {
  async listModels(filters: ListFilters) {
    const [items, categories, brands] = await Promise.all([
      aircraftModelsRepo.list(filters),
      categoriesService.listCategories(),
      brandsService.listBrands()
    ]);

    return {
      items,
      total: items.length,
      filters: {
        categories,
        brands,
        powerTypes: ["electric", "fuel", "hybrid", "other"] as const
      }
    };
  },
  async getModelDetail(slug: string, currentUserId?: string) {
    const item = await aircraftModelsRepo.findBySlug(slug);
    if (!item) {
      return null;
    }

    const [interactionSummary, viewer] = await Promise.all([
      aircraftModelsRepo.getInteractionSummary(item.id),
      aircraftModelsRepo.getViewerInteractionState(item.id, currentUserId ?? null)
    ]);

    return {
      ...item,
      interactionSummary,
      viewer
    };
  },
  async getModelDetailById(id: string) {
    const item = await aircraftModelsRepo.findById(id);
    return item;
  },
  async createModel(input: {
    slug: string;
    name: string;
    categoryId: string;
    brandId: string;
    powerType: string;
    summary: string | null;
    description: string | null;
    maxFlightTimeMinutes: number | null;
    maxRangeKilometers: number | null;
    maxSpeedKph: number | null;
    takeoffWeightGrams: number | null;
    isPublished: boolean;
  }) {
    return aircraftModelsRepo.create(input);
  },
  async updateModel(
    id: string,
    input: {
      slug: string;
      name: string;
      categoryId: string;
      brandId: string;
      powerType: string;
      summary: string | null;
      description: string | null;
      maxFlightTimeMinutes: number | null;
      maxRangeKilometers: number | null;
      maxSpeedKph: number | null;
      takeoffWeightGrams: number | null;
      isPublished: boolean;
    }
  ) {
    return aircraftModelsRepo.update(id, input);
  },
  async interactModel(
    slug: string,
    userId: string,
    type: "interested" | "favorite" | "share"
  ) {
    const item = await aircraftModelsRepo.findBySlug(slug);
    if (!item) {
      return null;
    }

    const result =
      type === "share"
        ? await aircraftModelsRepo.createShareInteraction(item.id, userId)
        : await aircraftModelsRepo.toggleModelInteraction({
            modelId: item.id,
            userId,
            type
          });
    const [summary, viewer] = await Promise.all([
      aircraftModelsRepo.getInteractionSummary(item.id),
      aircraftModelsRepo.getViewerInteractionState(item.id, userId)
    ]);

    return {
      item: {
        type,
        active: result.active,
        summary,
        viewer
      }
    };
  }
};
