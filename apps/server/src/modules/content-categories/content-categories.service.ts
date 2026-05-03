import { contentCategoriesRepo } from "./content-categories.repo";

export const contentCategoriesService = {
  async listEnabledCategories() {
    await contentCategoriesRepo.localizeDefaultNames();
    return contentCategoriesRepo.listEnabled();
  },
  async listAllCategories() {
    await contentCategoriesRepo.localizeDefaultNames();
    return contentCategoriesRepo.listAll();
  },
  async findBySlug(slug: string) {
    await contentCategoriesRepo.localizeDefaultNames();
    return contentCategoriesRepo.findBySlug(slug);
  },
  createCategory(input: {
    slug: string;
    name: string;
    sortOrder: number;
    isEnabled: boolean;
  }) {
    return contentCategoriesRepo.create(input);
  },
  updateCategory(
    id: string,
    input: {
      slug: string;
      name: string;
      sortOrder: number;
      isEnabled: boolean;
    }
  ) {
    return contentCategoriesRepo.update(id, input);
  }
};
