import { db, postsTable, runMigrations } from "@feijia/db";
import { API_ROUTES } from "@feijia/shared";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
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

describe.sequential("recommended cursor pagination", () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await resetIntegrationState("demo");
  });

  it("returns nextCursor and can paginate deeply without 200-candidate clipping", async () => {
    const authorId = await getSyntheticFeedAuthorId();
    const baseTime = new Date("2026-04-20T09:40:00.000Z");

    await replaceMomentFeedWithSyntheticPosts(
      authorId,
      Array.from({ length: 240 }, (_, index) => ({
        id: `moment_cursor_${index + 1}`,
        title: `Cursor ${index + 1}`,
        content: "Stable synthetic content for recommended cursor pagination coverage.",
        likeCount: index % 4,
        favoriteCount: index % 3,
        shareCount: index % 6,
        commentCount: index % 2,
        reportCount: 0,
        publishedAt: new Date(baseTime.getTime() - index * 60_000)
      }))
    );

    const pagePayloads: Array<{
      items: Array<{ id: string }>;
      nextCursor: string | null;
      pagination: { page: number; total: number; hasMore: boolean };
    }> = [];
    let cursor: string | undefined;

    for (let index = 0; index < 21; index += 1) {
      const query = cursor
        ? `${API_ROUTES.circleFeed}?tab=recommended&limit=10&cursor=${encodeURIComponent(cursor)}`
        : `${API_ROUTES.circleFeed}?tab=recommended&limit=10`;
      const response = await app.request(query, { method: "GET" });
      expect(response.status).toBe(200);

      const payload = (await response.json()) as {
        items: Array<{ id: string }>;
        nextCursor: string | null;
        pagination: { page: number; total: number; hasMore: boolean };
      };
      pagePayloads.push(payload);
      cursor = payload.nextCursor ?? undefined;
    }

    expect(pagePayloads[0]?.nextCursor).toBeTruthy();
    expect(pagePayloads[19]?.nextCursor).toBeTruthy();
    expect(pagePayloads[20]?.items).toHaveLength(10);
    expect(pagePayloads[20]?.pagination.total).toBeGreaterThanOrEqual(210);
    expect(pagePayloads[20]?.pagination.page).toBe(21);
    expect(pagePayloads[20]?.pagination.hasMore).toBe(true);

    const ids = pagePayloads.flatMap((payload) => payload.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
