// TODO: stub - implement Qiniu content audit integration
export const qiniuAuditService = {
  async reviewImage(_input: {
    domain: string;
    entityId: string;
    imageUrl: string;
  }) {
    return { jobId: "" };
  },
  async submitVideoReview(_input: {
    domain: string;
    entityId: string;
    videoUrl: string;
    callbackUrl: string;
  }) {
    return { jobId: "" };
  },
} as const;
