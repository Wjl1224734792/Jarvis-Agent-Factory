import { db, postsTable, runMigrations } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/app";
import { postsRepo } from "../src/modules/posts/posts.repo";
import { resetIntegrationState } from "./test-state";

async function getSyntheticFeedAuthorId() {
  return "seed_user_skyline";
}

async function replaceMomentFeedWithSyntheticPosts(
  authorId: string,
  items: Array<{
    id: string;
    title: string;
    content: string;
    likeCount?: number;
    favoriteCount?: number;
    shareCount?: number;
    commentCount?: number;
    reportCount?: number;
    viewCount?: number;
    publishedAt: Date;
  }>
) {
  await db.delete(postsTable).where(eq(postsTable.type, "moment"));
  await db.insert(postsTable).values(
    items.map((item) => ({
      id: item.id,
      authorId,
      type: "moment" as const,
      title: item.title,
      content: item.content,
      contentHtml: null,
      contentPlainText: item.content,
      contentCategoryId: null,
      coverImageFileId: null,
      status: "published" as const,
      rejectionReason: null,
      commentCount: item.commentCount ?? 0,
      reportCount: item.reportCount ?? 0,
      likeCount: item.likeCount ?? 0,
      favoriteCount: item.favoriteCount ?? 0,
      shareCount: item.shareCount ?? 0,
      viewCount: item.viewCount ?? 0,
      publishedAt: item.publishedAt,
      createdAt: item.publishedAt,
      updatedAt: item.publishedAt
    }))
  );
}

describe.sequential("recommended deep-page query window", () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await resetIntegrationState("demo");
  });

  it("pushes deep-page candidate clipping into repo query options while keeping page contract stable", async () => {
    const authorId = await getSyntheticFeedAuthorId();
    const baseTime = new Date("2026-04-20T09:40:00.000Z");
    const listFeedSpy = vi.spyOn(postsRepo, "listFeed");

    await replaceMomentFeedWithSyntheticPosts(
      authorId,
      Array.from({ length: 220 }, (_, index) => ({
        id: `moment_deep_window_${index + 1}`,
        title: `Deep window ${index + 1}`,
        content: "Stable synthetic content for recommended deep-page coverage.",
        likeCount: index % 4,
        favoriteCount: index % 3,
        shareCount: index % 6,
        commentCount: index % 2,
        reportCount: 0,
        publishedAt: new Date(baseTime.getTime() - index * 60_000)
      }))
    );

    const pageTwelveResponse = await app.request(`${API_ROUTES.circleFeed}?tab=recommended&limit=10&page=12`, {
      method: "GET"
    });
    const pageThirteenResponse = await app.request(`${API_ROUTES.circleFeed}?tab=recommended&limit=10&page=13`, {
      method: "GET"
    });

    expect(pageTwelveResponse.status).toBe(200);
    expect(pageThirteenResponse.status).toBe(200);

    const pageTwelvePayload = (await pageTwelveResponse.json()) as {
      items: Array<{ id: string }>;
      pagination: { total: number; hasMore: boolean };
    };
    const pageThirteenPayload = (await pageThirteenResponse.json()) as {
      items: Array<{ id: string }>;
      pagination: { total: number; hasMore: boolean };
    };

    expect(pageTwelvePayload.items).toHaveLength(10);
    expect(pageThirteenPayload.items).toHaveLength(10);
    expect(pageTwelvePayload.pagination.total).toBe(200);
    expect(pageThirteenPayload.pagination.total).toBe(200);
    expect(pageTwelvePayload.pagination.hasMore).toBe(true);
    expect(pageThirteenPayload.pagination.hasMore).toBe(true);

    expect(listFeedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: "recommended",
        type: "moment",
        page: 1,
        limit: 170,
        recommendedWindowOffset: 90,
        recommendedWindowLimit: 80
      })
    );
    expect(listFeedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: "recommended",
        type: "moment",
        page: 1,
        limit: 180,
        recommendedWindowOffset: 100,
        recommendedWindowLimit: 80
      })
    );

    const pageTwelveIds = new Set(pageTwelvePayload.items.map((item) => item.id));
    const pageThirteenIds = new Set(pageThirteenPayload.items.map((item) => item.id));
    const overlap = [...pageTwelveIds].filter((id) => pageThirteenIds.has(id));
    expect(overlap).toHaveLength(0);

    listFeedSpy.mockRestore();
  });
});
