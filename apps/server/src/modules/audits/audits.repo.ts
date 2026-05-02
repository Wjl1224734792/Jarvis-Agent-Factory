// TODO: stub - implement audit persistence
export const auditsRepo = {
  async create(_input: Record<string, unknown>) {
    return {
      id: "",
      domain: "",
      entityId: "",
      contentType: "",
      mode: "",
      status: "",
      errorMessage: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
} as const;
