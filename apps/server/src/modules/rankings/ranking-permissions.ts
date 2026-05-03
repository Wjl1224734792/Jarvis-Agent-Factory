type CurrentUser = {
  id: string;
  role: "user" | "admin";
};

type RankingStatus = "pending" | "published" | "rejected" | "hidden";

export function canManageRanking(input: {
  currentUser?: CurrentUser;
  rankingType: "official" | "community";
  rankingAuthorId: string;
}) {
  if (!input.currentUser) {
    return false;
  }

  if (input.currentUser.role === "admin") {
    return true;
  }

  return input.rankingType === "community" && input.currentUser.id === input.rankingAuthorId;
}

export function canManageRatingTarget(input: {
  currentUser?: CurrentUser;
  rankingType: "official" | "community";
  rankingAuthorId: string;
  itemAuthorId: string;
}) {
  if (!input.currentUser) {
    return false;
  }

  if (input.currentUser.role === "admin") {
    return true;
  }

  if (input.rankingType === "community" && input.currentUser.id === input.rankingAuthorId) {
    return true;
  }

  return input.currentUser.id === input.itemAuthorId;
}

export function canInspectRatingTarget(input: {
  currentUser?: CurrentUser;
  rankingType: "official" | "community";
  rankingAuthorId: string;
  itemAuthorId: string;
  itemStatus: RankingStatus;
}) {
  if (input.itemStatus === "published") {
    return true;
  }

  return canManageRatingTarget(input);
}

export function toRankingViewer(input: {
  currentUser?: CurrentUser;
  authorId: string;
  itemAddPolicy: "public" | "owner";
  type: "official" | "community";
  status: RankingStatus;
}) {
  const canEdit = canManageRanking({
    currentUser: input.currentUser,
    rankingType: input.type,
    rankingAuthorId: input.authorId
  });
  const canOpenPublicAdd =
    input.type === "community" && (input.status === "published" || input.status === "pending");

  return {
    canEdit,
    canAddItems:
      Boolean(input.currentUser) &&
      (canEdit || (input.itemAddPolicy === "public" && canOpenPublicAdd))
  };
}
