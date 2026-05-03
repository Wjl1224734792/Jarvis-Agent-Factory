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

function decodeRecommendedCursor(cursor: string) {
  expect(cursor.startsWith("seek:")).toBe(true);
  const payload = JSON.parse(Buffer.from(cursor.slice("seek:".length), "base64url").toString("utf8")) as {
    v?: unknown;
    t?: unknown;
    s?: unknown;
    n?: unknown;
    p?: unknown;
    i?: unknown;
  };
  expect(payload.t).toBe("recommended");
  return payload;
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
      pagination: { limit: number; hasMore: boolean };
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
        pagination: { limit: number; hasMore: boolean };
      };
      pagePayloads.push(payload);
      cursor = payload.nextCursor ?? undefined;
    }

    expect(pagePayloads[0]?.nextCursor).toBeTruthy();
    expect(pagePayloads[19]?.nextCursor).toBeTruthy();
    expect(pagePayloads[20]?.items).toHaveLength(10);
    expect(pagePayloads[20]?.pagination.limit).toBe(10);
    expect(pagePayloads[20]?.pagination.hasMore).toBe(true);

    const ids = pagePayloads.flatMap((payload) => payload.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps recommended cursor contract fields and malformed cursor compatibility", async () => {
    const authorId = await getSyntheticFeedAuthorId();
    const baseTime = new Date("2026-04-20T11:40:00.000Z");

    await replaceMomentFeedWithSyntheticPosts(
      authorId,
      Array.from({ length: 40 }, (_, index) => ({
        id: `moment_cursor_contract_${index + 1}`,
        title: `Cursor contract ${index + 1}`,
        content: "Stable synthetic content for recommended cursor contract coverage.",
        reportCount: 0,
        publishedAt: new Date(baseTime.getTime() - index * 60_000)
      }))
    );

    const firstPageResponse = await app.request(`${API_ROUTES.circleFeed}?tab=recommended&limit=10`, {
      method: "GET"
    });
    expect(firstPageResponse.status).toBe(200);
    const firstPage = (await firstPageResponse.json()) as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
      pagination: { limit: number; hasMore: boolean };
    };
    expect(firstPage.nextCursor).toBeTruthy();
    expect(firstPage.pagination.limit).toBe(10);

    const cursor = firstPage.nextCursor ?? "";
    const payload = decodeRecommendedCursor(cursor);
    expect(payload).toMatchObject({
      v: 1,
      t: "recommended",
      s: expect.any(Number),
      n: expect.any(String),
      p: expect.any(String),
      i: expect.any(String)
    });
    expect(Number.isNaN(new Date(String(payload.n)).getTime())).toBe(false);
    expect(Number.isNaN(new Date(String(payload.p)).getTime())).toBe(false);

    const malformedResponse = await app.request(
      `${API_ROUTES.circleFeed}?tab=recommended&limit=10&cursor=${encodeURIComponent("not-a-seek-cursor")}`,
      {
        method: "GET"
      }
    );
    expect(malformedResponse.status).toBe(200);
    const malformedPage = (await malformedResponse.json()) as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
      pagination: { limit: number; hasMore: boolean };
    };
    expect(malformedPage.pagination.limit).toBe(10);
    expect(malformedPage.items.map((item) => item.id)).toEqual(firstPage.items.map((item) => item.id));

    const legacyFeedCursor = `seek:${Buffer.from(
      JSON.stringify({
        v: 1,
        t: "feed",
        p: payload.p,
        i: payload.i
      }),
      "utf8"
    ).toString("base64url")}`;
    const legacyResponse = await app.request(
      `${API_ROUTES.circleFeed}?tab=recommended&limit=10&cursor=${encodeURIComponent(legacyFeedCursor)}`,
      {
        method: "GET"
      }
    );
    expect(legacyResponse.status).toBe(200);
    const legacyPage = (await legacyResponse.json()) as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
      pagination: { limit: number; hasMore: boolean };
    };
    expect(legacyPage.pagination.limit).toBe(10);
    expect(legacyPage.items.map((item) => item.id)).toEqual(firstPage.items.map((item) => item.id));
  });

  it("keeps recommended pagination stable when a new top candidate appears between pages", async () => {
    const authorId = await getSyntheticFeedAuthorId();
    const baseTime = new Date("2026-04-20T10:40:00.000Z");

    await replaceMomentFeedWithSyntheticPosts(
      authorId,
      Array.from({ length: 40 }, (_, index) => ({
        id: `moment_seek_stable_${index + 1}`,
        title: `Seek stable ${index + 1}`,
        content: "Stable synthetic content for seek pagination stability.",
        likeCount: index % 4,
        favoriteCount: index % 3,
        shareCount: index % 6,
        commentCount: index % 2,
        reportCount: 0,
        publishedAt: new Date(baseTime.getTime() - index * 60_000)
      }))
    );

    const pageOneResponse = await app.request(`${API_ROUTES.circleFeed}?tab=recommended&limit=10`, {
      method: "GET"
    });
    expect(pageOneResponse.status).toBe(200);
    const pageOne = (await pageOneResponse.json()) as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
      pagination: { limit: number; hasMore: boolean };
    };
    expect(pageOne.nextCursor).toBeTruthy();

    await db.insert(postsTable).values({
      id: "moment_seek_stable_inserted",
      authorId,
      type: "moment",
      title: "Inserted after page one",
      content: "Inserted candidate between recommended page fetches.",
      contentHtml: null,
      contentPlainText: "Inserted candidate between recommended page fetches.",
      contentCategoryId: null,
      coverImageFileId: null,
      status: "published",
      rejectionReason: null,
      commentCount: 0,
      reportCount: 0,
      likeCount: 0,
      favoriteCount: 0,
      shareCount: 0,
      viewCount: 0,
      publishedAt: new Date(baseTime.getTime() + 120_000),
      createdAt: new Date(baseTime.getTime() + 120_000),
      updatedAt: new Date(baseTime.getTime() + 120_000)
    });

    const pageTwoResponse = await app.request(
      `${API_ROUTES.circleFeed}?tab=recommended&limit=10&cursor=${encodeURIComponent(pageOne.nextCursor ?? "")}`,
      {
        method: "GET"
      }
    );
    expect(pageTwoResponse.status).toBe(200);
    const pageTwo = (await pageTwoResponse.json()) as {
      items: Array<{ id: string }>;
      pagination: { limit: number; hasMore: boolean };
    };

    const pageOneIds = new Set(pageOne.items.map((item) => item.id));
    const pageTwoIds = pageTwo.items.map((item) => item.id);
    const overlap = pageTwoIds.filter((id) => pageOneIds.has(id));
    expect(pageTwo.pagination.limit).toBe(10);
    expect(overlap).toHaveLength(0);
    expect(pageTwoIds).not.toContain("moment_seek_stable_inserted");
  });
});
