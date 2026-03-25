import { contentCategoriesRepo } from "./content-categories.repo";

export const contentCategoriesService = {
  listEnabledCategories() {
    return contentCategoriesRepo.listEnabled();
  },
  listAllCategories() {
    return contentCategoriesRepo.listAll();
  },
  findBySlug(slug: string) {
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
