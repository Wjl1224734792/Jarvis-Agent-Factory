import { and, eq } from "drizzle-orm";
import {
  aircraftModelsTable,
  brandsTable,
  circlePostsTable,
  circlesTable,
  db,
  postsTable,
  usersTable,
} from "@feijia/db";
import { resolveUploadedFileUrl } from "../uploads/uploads.helpers";

async function resolveModelPreview(slug: string) {
  const rows = await db
    .select({
      slug: aircraftModelsTable.slug,
      name: aircraftModelsTable.name,
      coverImageFileId: aircraftModelsTable.coverImageFileId,
      priceMin: aircraftModelsTable.priceMin,
      priceMax: aircraftModelsTable.priceMax,
      brandName: brandsTable.name,
    })
    .from(aircraftModelsTable)
    .innerJoin(brandsTable, eq(aircraftModelsTable.brandId, brandsTable.id))
    .where(
      and(
        eq(aircraftModelsTable.slug, slug),
        eq(aircraftModelsTable.isPublished, true),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];
  const coverUrl = row.coverImageFileId
    ? await resolveUploadedFileUrl(row.coverImageFileId)
    : null;
  return {
    type: "model" as const,
    title: row.name,
    coverUrl,
    description: row.brandName
      ? `${row.brandName}${row.priceMin != null ? ` · ¥${row.priceMin}` : ""}`
      : null,
    href: `/models/${row.slug}`,
  };
}

async function resolvePostPreview(postId: string) {
  const rows = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      summary: postsTable.aiSummary,
      coverImageFileId: postsTable.coverImageFileId,
      authorName: usersTable.displayName,
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(
      and(
        eq(postsTable.id, postId),
        eq(postsTable.status, "published"),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];
  const coverUrl = row.coverImageFileId
    ? await resolveUploadedFileUrl(row.coverImageFileId)
    : null;
  return {
    type: "post" as const,
    title: row.title,
    coverUrl,
    description: row.summary ?? `作者: ${row.authorName}`,
    href: `/posts/${row.id}`,
  };
}

async function resolveCirclePreview(slug: string) {
  const rows = await db
    .select({
      id: circlesTable.id,
      slug: circlesTable.slug,
      name: circlesTable.name,
      description: circlesTable.description,
      coverImageFileId: circlesTable.coverImageFileId,
    })
    .from(circlesTable)
    .where(eq(circlesTable.slug, slug))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];
  const coverUrl = row.coverImageFileId
    ? await resolveUploadedFileUrl(row.coverImageFileId)
    : null;
  return {
    type: "circle" as const,
    title: row.name,
    coverUrl,
    description: row.description ?? null,
    href: `/circles/${row.slug}`,
  };
}

export type LinkPreviewResult = {
  type: "model" | "post" | "circle" | "unknown";
  title?: string;
  coverUrl?: string | null;
  description?: string | null;
  href: string;
};

export const linkPreviewRepo = {
  async resolve(url: string): Promise<LinkPreviewResult> {
    // 机型详情: /models/:slug
    const modelMatch = url.match(/\/models\/([a-zA-Z0-9_-]+)/);
    if (modelMatch) {
      const preview = await resolveModelPreview(modelMatch[1]);
      if (preview) return preview;
    }

    // 文章详情: /posts/:id
    const postMatch = url.match(/\/posts\/(post_[a-zA-Z0-9]+)/);
    if (postMatch) {
      const preview = await resolvePostPreview(postMatch[1]);
      if (preview) return preview;
    }

    // 圈子详情: /circles/:slug
    const circleMatch = url.match(/\/circles\/([a-zA-Z0-9_-]+)/);
    if (circleMatch) {
      const preview = await resolveCirclePreview(circleMatch[1]);
      if (preview) return preview;
    }

    return { type: "unknown", href: url };
  },
};
