import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function readSource(filePath: string) {
  return readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

function ensureNoIpLocationText(filePath: string, label: string) {
  const source = readSource(filePath);
  expect(source.includes("IpLocationText"), `${label}: no IpLocationText should exist`).toBe(false);
}

function ensureProfileVariant(filePath: string, label: string) {
  const source = readSource(filePath);
  expect(source.includes(`variant="profile"`), `${label}: profile variant expected`).toBe(true);
  expect(source.includes("variant=\"plain\""), `${label}: plain usage also exists for list fallback`).toBe(false);
}

function ensureTimeLineUsesPlain(filePath: string, marker: RegExp, label: string) {
  const source = readSource(filePath);
  const markerMatch = source.match(marker);
  expect(markerMatch, `${label}: time marker should exist`).not.toBeNull();
  const markerIndex = markerMatch?.index ?? -1;
  const nearbySlice = source.slice(markerIndex, markerIndex + 420);
  expect(nearbySlice.includes("IpLocationText"), `${label}: time line should render location`).toBe(true);
  expect(nearbySlice.includes(`variant="plain"`), `${label}: location should be plain variant`).toBe(true);
}

function splitByDatePrefix(source: string, marker: RegExp) {
  const markerMatch = source.match(marker);
  expect(markerMatch, "Date marker should exist").not.toBeNull();
  const markerIndex = markerMatch?.index ?? -1;
  const returnIndex = source.lastIndexOf("return", markerIndex);
  const scanStart = returnIndex >= 0 ? source.indexOf("(", returnIndex) : 0;
  return source.slice(scanStart, markerIndex);
}

describe("IP location rendering policy", () => {
  it("keeps list pages free of IpLocationText on home/circle/rankings", () => {
    ensureNoIpLocationText("apps/web/src/routes/home-page.tsx", "HomePage");
    ensureNoIpLocationText("apps/web/src/routes/circle-page-feed.tsx", "CirclePageFeed");
    ensureNoIpLocationText("apps/web/src/routes/rankings-page.tsx", "RankingsPage");
  });

  it("uses plain variant in detail pages time rows", () => {
    ensureTimeLineUsesPlain(
      "apps/web/src/routes/post-detail-page.tsx",
      /new Date\s*\(\s*item\.publishedAt\s*\?\?\s*item\.createdAt\s*\)\.toLocaleDateString\("zh-CN"\)/,
      "PostDetailPage"
    );
    ensureTimeLineUsesPlain(
      "apps/web/src/routes/circle-page-detail.tsx",
      /new Date\s*\(\s*selectedNote\.publishedAt\s*\?\?\s*selectedNote\.createdAt\s*\)\.toLocaleDateString\("zh-CN"\)/,
      "CirclePageDetail"
    );
    ensureTimeLineUsesPlain(
      "apps/web/src/routes/ranking-detail-page.tsx",
      /item\.value ===\s*new Date\s*\(\s*ranking\.createdAt\s*\)\.toLocaleDateString\("zh-CN"\)/,
      "RankingDetailPage"
    );
    ensureTimeLineUsesPlain(
      "apps/web/src/routes/rating-target-detail-header.tsx",
      /new Date\s*\(\s*props\.item\.createdAt\s*\)\.toLocaleDateString\("zh-CN"\)/,
      "RatingTargetDetailHeader"
    );
  });

  it("keeps author profile blocks from invoking IpLocationText directly", () => {
    const postSource = readSource("apps/web/src/routes/post-detail-page.tsx");
    const postScan = splitByDatePrefix(
      postSource,
      /new Date\s*\(\s*item\.publishedAt\s*\?\?\s*item\.createdAt\s*\)\.toLocaleDateString\("zh-CN"\)/
    );
    expect(postScan.includes("IpLocationText"), "PostDetailPage author block should not render location").toBe(false);

    const circleSource = readSource("apps/web/src/routes/circle-page-detail.tsx");
    const circleScan = splitByDatePrefix(
      circleSource,
      /new Date\s*\(\s*selectedNote\.publishedAt\s*\?\?\s*selectedNote\.createdAt\s*\)\.toLocaleDateString\("zh-CN"\)/
    );
    expect(circleScan.includes("IpLocationText"), "CirclePageDetail author block should not render location").toBe(false);

    const rankingSource = readSource("apps/web/src/routes/ranking-detail-page.tsx");
    const rankingScan = splitByDatePrefix(
      rankingSource,
      /item\.value ===\s*new Date\s*\(\s*ranking\.createdAt\s*\)\.toLocaleDateString\("zh-CN"\)/
    );
    expect(rankingScan.includes("IpLocationText"), "RankingDetailPage author block should not render location").toBe(false);

    const ratingTargetSource = readSource("apps/web/src/routes/rating-target-detail-header.tsx");
    const ratingTargetScan = splitByDatePrefix(
      ratingTargetSource,
      /new Date\s*\(\s*props\.item\.createdAt\s*\)\.toLocaleDateString\("zh-CN"\)/
    );
    expect(ratingTargetScan.includes("IpLocationText"), "RatingTargetDetailHeader author block should not render location").toBe(false);
  });

  it("uses profile variant on self and visitor profile pages", () => {
    ensureProfileVariant("apps/web/src/features/auth/profile-page.tsx", "Self profile page");
    ensureProfileVariant("apps/web/src/routes/user-profile-page.tsx", "User profile page");
  });

  it("keeps comment/reply usage to plain variant only", () => {
    const postCommentSource = readSource("apps/web/src/features/posts/post-comment-thread.tsx");
    expect(postCommentSource.includes("variant=\"plain\"")).toBe(true);
    expect(postCommentSource.includes("variant=\"profile\"")).toBe(false);

    const modelCommentSource = readSource("apps/web/src/routes/model-comments-section.tsx");
    expect(modelCommentSource.includes("variant=\"plain\"")).toBe(true);
    expect(modelCommentSource.includes("variant=\"profile\"")).toBe(false);

    const ratingTargetCommentSource = readSource("apps/web/src/routes/rating-target-detail-comment-card.tsx");
    expect(ratingTargetCommentSource.includes("variant=\"plain\"")).toBe(true);
    expect(ratingTargetCommentSource.includes("variant=\"profile\"")).toBe(false);
  });
});
