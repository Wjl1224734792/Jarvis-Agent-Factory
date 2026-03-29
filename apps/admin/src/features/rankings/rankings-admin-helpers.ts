export type AdminRankingStatus = "pending" | "published" | "rejected" | "hidden";

export type AdminRankingRecord = {
  id: string;
  type: "official" | "community";
  status: AdminRankingStatus;
  title: string;
  description: string;
  coverImageUrl: string | null;
  itemAddPolicy: "public" | "owner";
  commentCount: number;
  itemCount: number;
  averageScore: number;
  createdAt: string;
  items: Array<{
    id: string;
    rank: number;
    title: string;
    summary: string | null;
    imageUrl: string | null;
    brandName: string | null;
    averageScore: number;
    linkedModel: {
      slug: string;
      name: string;
      brand: {
        name: string;
      };
    } | null;
  }>;
  author: {
    id: string;
    displayName: string;
    role: "user" | "admin";
  };
};

export type RankingDraftItem = {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  brandName: string;
  linkedModelSlug: string | null;
  linkedModelName: string | null;
};

export function createEmptyRankingDraftItem(): RankingDraftItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    summary: "",
    imageUrl: "",
    brandName: "",
    linkedModelSlug: null,
    linkedModelName: null
  };
}

export function toRankingDraftItems(items: AdminRankingRecord["items"]): RankingDraftItem[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary ?? "",
    imageUrl: item.imageUrl ?? "",
    brandName: item.brandName ?? item.linkedModel?.brand.name ?? "",
    linkedModelSlug: item.linkedModel?.slug ?? null,
    linkedModelName: item.linkedModel?.name ?? null
  }));
}

export function buildRankingPayload(
  values: {
    title: string;
    description: string;
    coverImageUrl?: string | null;
    itemAddPolicy: "public" | "owner";
  },
  draftItems: RankingDraftItem[]
) {
  return {
    type: "official" as const,
    title: values.title.trim(),
    description: values.description.trim(),
    coverImageUrl: values.coverImageUrl?.trim() ? values.coverImageUrl.trim() : null,
    itemAddPolicy: values.itemAddPolicy,
    items: draftItems.map((item) => ({
      title: item.title.trim(),
      summary: item.summary.trim() ? item.summary.trim() : null,
      imageUrl: item.imageUrl.trim() ? item.imageUrl.trim() : null,
      brandName: item.brandName.trim() ? item.brandName.trim() : null,
      linkedModelSlug: item.linkedModelSlug
    }))
  };
}

export function partitionRankingRecords(items: AdminRankingRecord[]) {
  return {
    official: items.filter((item) => item.type === "official"),
    community: items.filter((item) => item.type === "community")
  };
}

export function formatCommunityRankingStatus(status: AdminRankingStatus) {
  switch (status) {
    case "pending":
      return "待审核";
    case "published":
      return "已发布";
    case "rejected":
      return "已驳回";
    case "hidden":
      return "已隐藏";
  }
}
