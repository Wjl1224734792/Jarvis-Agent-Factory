import { reviewsRepo } from "./reviews.repo";

function toAverageScore(rawAverage: number): number {
  return Number((rawAverage * 2).toFixed(1));
}

function serializeReview<T extends { createdAt: Date; updatedAt: Date }>(review: T) {
  return {
    ...review,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString()
  };
}

export const reviewsService = {
  async listModelReviews(slug: string, currentUserId?: string) {
    const model = await reviewsRepo.findModelBySlug(slug);

    if (!model) {
      return null;
    }

    const [items, aggregate, myReview] = await Promise.all([
      reviewsRepo.listVisibleReviewsByModel(model.id),
      reviewsRepo.getRatingAggregate(model.id),
      currentUserId ? reviewsRepo.getUserReview(model.id, currentUserId) : Promise.resolve(null)
    ]);

    return {
      items: items.map((item) => serializeReview(item)),
      summary: {
        averageScore: toAverageScore(Number(aggregate.averageRaw ?? 0)),
        totalReviews: Number(aggregate.totalReviews ?? 0),
        myReview: myReview ? serializeReview(myReview) : null
      }
    };
  },
  async submitReview(
    slug: string,
    userId: string,
    input: {
      rating: number;
      content: string | null;
    }
  ) {
    const model = await reviewsRepo.findModelBySlug(slug);

    if (!model) {
      return null;
    }

    const reviewId = await reviewsRepo.upsertReview({
      modelId: model.id,
      userId,
      rating: input.rating,
      content: input.content
    });

    const [item, summary] = await Promise.all([
      reviewsRepo.getUserReview(model.id, userId),
      this.listModelReviews(slug, userId)
    ]);

    if (!item || !summary) {
      return null;
    }

    return {
      item: serializeReview(item),
      summary: summary.summary
    };
  },
  async listAdminReviews() {
    return {
      items: (await reviewsRepo.listAdminReviews()).map((item) => serializeReview(item))
    };
  },
  async updateReviewStatus(id: string, status: "visible" | "hidden") {
    const item = await reviewsRepo.updateReviewStatus(id, status);
    return item ? serializeReview(item) : null;
  }
};
