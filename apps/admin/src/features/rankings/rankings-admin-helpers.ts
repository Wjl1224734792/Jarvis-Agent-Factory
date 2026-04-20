import type { RankingListItem, RankingStatus } from "@feijia/schemas";

export type AdminRankingStatus = RankingStatus;
export type AdminRankingRecord = RankingListItem;

export type RankingDraftItem = {
  id: string;
  title: string;
  summary: string;
  imageFileId: string;
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
    imageFileId: "",
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
    imageFileId: item.imageFileId ?? "",
    imageUrl: item.imageUrl ?? "",
    brandName: item.brandName ?? item.linkedModel?.brand.name ?? "",
    linkedModelSlug: item.linkedModel?.slug ?? null,
    linkedModelName: item.linkedModel?.name ?? null
  }));
}

export function buildRankingPayload(
  values: {
    title: string;
    coverImageFileId?: string | null;
    itemAddPolicy: "public" | "owner";
  },
  draftItems: RankingDraftItem[]
) {
  return {
    type: "official" as const,
    title: values.title.trim(),
    coverImageFileId: values.coverImageFileId?.trim() ? values.coverImageFileId.trim() : null,
    itemAddPolicy: values.itemAddPolicy,
    items: draftItems.map((item) => ({
      title: item.title.trim(),
      summary: item.summary.trim() ? item.summary.trim() : null,
      imageFileId: item.imageFileId.trim() ? item.imageFileId.trim() : null,
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
