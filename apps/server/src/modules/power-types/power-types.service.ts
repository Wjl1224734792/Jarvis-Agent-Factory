import { createId } from "@feijia/db";
import { powerTypesRepo } from "./power-types.repo";

type CreatePowerTypeInput = {
  slug: string;
  name: string;
};

type UpdatePowerTypeInput = {
  slug: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
};

export const powerTypesService = {
  async listPowerTypes() {
    return powerTypesRepo.listAll();
  },

  async createPowerType(input: CreatePowerTypeInput) {
    return powerTypesRepo.create({
      id: createId("pwt"),
      slug: input.slug,
      name: input.name,
    });
  },

  async updatePowerType(id: string, input: UpdatePowerTypeInput) {
    return powerTypesRepo.update(id, input);
  },
};
