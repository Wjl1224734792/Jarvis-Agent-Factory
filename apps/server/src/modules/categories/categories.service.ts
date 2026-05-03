import { categoriesRepo } from "./categories.repo";

export const categoriesService = {
  listCategories() {
    return categoriesRepo.list();
  },
  createCategory(input: {
    slug: string;
    name: string;
    sortOrder: number;
    isEnabled: boolean;
  }) {
    return categoriesRepo.create(input);
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
    return categoriesRepo.update(id, input);
  }
};
