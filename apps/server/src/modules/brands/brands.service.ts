import { brandsRepo } from "./brands.repo";

export const brandsService = {
  listBrands() {
    return brandsRepo.list();
  },
  createBrand(input: {
    slug: string;
    name: string;
    logoUrl: string | null;
    categoryId: string | null;
    sortOrder: number;
    isEnabled: boolean;
  }) {
    return brandsRepo.create(input);
  },
  updateBrand(
    id: string,
    input: {
      slug: string;
      name: string;
      logoUrl: string | null;
      categoryId: string | null;
      sortOrder: number;
      isEnabled: boolean;
    }
  ) {
    return brandsRepo.update(id, input);
  }
};
