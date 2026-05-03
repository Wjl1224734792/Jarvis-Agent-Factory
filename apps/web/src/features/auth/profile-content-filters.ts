import type { UserContentItem } from "@feijia/schemas";

export type ProfilePrimaryTab = "content" | "favorites";
export type ProfileContentCategory = "article" | "moment" | "ranking" | "brand" | "aircraft";
export type ProfileLifecycle = "all" | "draft" | "reviewing" | "published" | "rejected";

export function isFavoriteItem(item: UserContentItem) {
  return item.type === "favorite-post" || item.type === "favorite-model";
}

export function getProfileItemCategory(item: UserContentItem): ProfileContentCategory {
  switch (item.type) {
    case "post":
    case "favorite-post":
      return item.postType === "article" ? "article" : "moment";
    case "ranking":
    case "rating-target":
      return "ranking";
    case "brand-application":
      return "brand";
    case "aircraft":
    case "review":
    case "favorite-model":
      return "aircraft";
  }
}

export function getProfileItemLifecycle(item: UserContentItem): ProfileLifecycle {
  switch (item.type) {
    case "post":
      switch (item.status) {
        case "pending":
          return "reviewing";
        case "rejected":
        case "hidden":
          return "rejected";
        default:
          return "published";
      }
    case "ranking":
    case "rating-target":
      switch (item.status) {
        case "pending":
          return "reviewing";
        case "rejected":
        case "hidden":
          return "rejected";
        default:
          return "published";
      }
    case "brand-application":
      switch (item.status) {
        case "pending":
          return "reviewing";
        case "rejected":
        case "hidden":
          return "rejected";
        default:
          return "published";
      }
    case "aircraft":
      switch (item.status) {
        case "draft":
          return "draft";
        case "submitted":
          return "reviewing";
        case "rejected":
          return "rejected";
        default:
          return "published";
      }
    case "review":
    case "favorite-post":
    case "favorite-model":
      return "published";
  }
}

export function filterProfileItems(
  items: UserContentItem[],
  input: {
    primaryTab: ProfilePrimaryTab;
    category: ProfileContentCategory;
    lifecycle?: ProfileLifecycle;
  }
) {
  return items.filter((item) => {
    if (input.primaryTab === "favorites" && !isFavoriteItem(item)) {
      return false;
    }

    if (input.primaryTab === "content" && isFavoriteItem(item)) {
      return false;
    }

    if (getProfileItemCategory(item) !== input.category) {
      return false;
    }

    if (input.primaryTab === "favorites" || !input.lifecycle || input.lifecycle === "all") {
      return true;
    }

    return getProfileItemLifecycle(item) === input.lifecycle;
  });
}
