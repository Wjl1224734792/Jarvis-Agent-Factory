import {
  brandApplicationsTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  aircraftSubmissionsTable,
  db,
  postCommentsTable,
  postsTable,
  ratingTargetsTable,
  rankingsTable,
  sessionsTable,
  usersTable
} from "@feijia/db";
import { and, eq, inArray, sql } from "drizzle-orm";

type RegistrationRecord = {
  createdAt: Date;
};

type SessionRecord = {
  userId: string;
  createdAt: Date;
};

type ModerationBucket = {
  queueEntered: number;
  pending: number;
  approved: number;
  rejected: number;
  hidden: number;
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfUtcYear(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function addUtcDays(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + amount));
}

function addUtcMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function addUtcYears(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear() + amount, 0, 1));
}

function toUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toUtcMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toUtcYearKey(date: Date) {
  return String(date.getUTCFullYear());
}

function buildDailyRegistrationSeries(records: RegistrationRecord[], now: Date) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = toUtcDayKey(record.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: 30 }, (_, index) => {
    const periodStart = addUtcDays(startOfUtcDay(now), -(29 - index));
    return {
      periodStart: periodStart.toISOString(),
      value: counts.get(toUtcDayKey(periodStart)) ?? 0
    };
  });
}

function buildMonthlyRegistrationSeries(records: RegistrationRecord[], now: Date) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = toUtcMonthKey(record.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: 12 }, (_, index) => {
    const periodStart = addUtcMonths(startOfUtcMonth(now), -(11 - index));
    return {
      periodStart: periodStart.toISOString(),
      value: counts.get(toUtcMonthKey(periodStart)) ?? 0
    };
  });
}

function buildYearlyRegistrationSeries(records: RegistrationRecord[], now: Date) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = toUtcYearKey(record.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: 5 }, (_, index) => {
    const periodStart = addUtcYears(startOfUtcYear(now), -(4 - index));
    return {
      periodStart: periodStart.toISOString(),
      value: counts.get(toUtcYearKey(periodStart)) ?? 0
    };
  });
}

function buildSessionSeries(records: SessionRecord[], now: Date, kind: "day" | "month" | "year") {
  const buckets = new Map<string, Set<string>>();

  for (const record of records) {
    const key =
      kind === "day"
        ? toUtcDayKey(record.createdAt)
        : kind === "month"
          ? toUtcMonthKey(record.createdAt)
          : toUtcYearKey(record.createdAt);
    const users = buckets.get(key) ?? new Set<string>();
    users.add(record.userId);
    buckets.set(key, users);
  }

  const length = kind === "day" ? 30 : kind === "month" ? 12 : 5;
  return Array.from({ length }, (_, index) => {
    const periodStart =
      kind === "day"
        ? addUtcDays(startOfUtcDay(now), -(29 - index))
        : kind === "month"
          ? addUtcMonths(startOfUtcMonth(now), -(11 - index))
          : addUtcYears(startOfUtcYear(now), -(4 - index));
    const key =
      kind === "day"
        ? toUtcDayKey(periodStart)
        : kind === "month"
          ? toUtcMonthKey(periodStart)
          : toUtcYearKey(periodStart);

    return {
      periodStart: periodStart.toISOString(),
      value: buckets.get(key)?.size ?? 0
    };
  });
}

function countPeriod(records: RegistrationRecord[], start: Date, end: Date) {
  return records.filter((record) => record.createdAt >= start && record.createdAt < end).length;
}

function countSessionPeriod(records: SessionRecord[], start: Date, end: Date) {
  return new Set(
    records
      .filter((record) => record.createdAt >= start && record.createdAt < end)
      .map((record) => record.userId)
  ).size;
}

function buildFunnelBucket(bucket: ModerationBucket) {
  return {
    queueEntered: bucket.queueEntered,
    pending: bucket.pending,
    approved: bucket.approved,
    rejectedOrHidden: bucket.rejected + bucket.hidden
  };
}

function moderationFromRows(
  rows: Array<{ status: string }>,
  mapping: { pending: string[]; approved: string[]; rejected: string[]; hidden: string[] }
): ModerationBucket {
  const count = (statuses: string[]) => rows.filter((row) => statuses.includes(row.status)).length;

  return {
    queueEntered: rows.length,
    pending: count(mapping.pending),
    approved: count(mapping.approved),
    rejected: count(mapping.rejected),
    hidden: count(mapping.hidden)
  };
}

export const adminAnalyticsService = {
  async getOverview() {
    const now = new Date();
    const [
      users,
      sessions,
      allSessions,
      posts,
      comments,
      reviews,
      submissions,
      brandApplications,
      rankingItems,
      allUsersCountRows,
      rankingsCountRows,
      publishedModelsCountRows
    ] = await Promise.all([
      db
        .select({
          createdAt: usersTable.createdAt
        })
        .from(usersTable)
        .where(eq(usersTable.role, "user")),
      db
        .select({
          userId: sessionsTable.userId,
          createdAt: sessionsTable.createdAt
        })
        .from(sessionsTable)
        .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
        .where(and(inArray(sessionsTable.scope, ["web", "app"]), eq(usersTable.role, "user"))),
      db
        .select({
          userId: sessionsTable.userId,
          createdAt: sessionsTable.createdAt
        })
        .from(sessionsTable),
      db
        .select({
          type: postsTable.type,
          status: postsTable.status
        })
        .from(postsTable),
      db
        .select({
          status: postCommentsTable.status
        })
        .from(postCommentsTable),
      db
        .select({
          status: aircraftReviewsTable.status
        })
        .from(aircraftReviewsTable),
      db
        .select({
          status: aircraftSubmissionsTable.status
        })
        .from(aircraftSubmissionsTable),
      db
        .select({
          status: brandApplicationsTable.status
        })
        .from(brandApplicationsTable),
      db
        .select({
          status: ratingTargetsTable.status
        })
        .from(ratingTargetsTable),
      db
        .select({
          count: sql<number>`count(*)`
        })
        .from(usersTable),
      db
        .select({
          count: sql<number>`count(*)`
        })
        .from(rankingsTable),
      db
        .select({
          count: sql<number>`count(*)`
        })
        .from(aircraftModelsTable)
        .where(eq(aircraftModelsTable.isPublished, true))
    ]);

    const registrationRecords = users as RegistrationRecord[];
    const sessionRecords = sessions as SessionRecord[];
    const allSessionRecords = allSessions as SessionRecord[];

    const postRows = posts.map((item) => ({ type: item.type, status: item.status }));
    const commentRows = comments.map((item) => ({ status: item.status }));
    const reviewRows = reviews.map((item) => ({ status: item.status }));
    const submissionRows = submissions.map((item) => ({ status: item.status }));
    const brandApplicationRows = brandApplications.map((item) => ({ status: item.status }));
    const rankingItemRows = rankingItems.map((item) => ({ status: item.status }));

    const articles = postRows.filter((item) => item.type === "article").length;
    const moments = postRows.filter((item) => item.type === "moment").length;
    const aircraft = Number(publishedModelsCountRows[0]?.count ?? 0);
    const rankings = Number(rankingsCountRows[0]?.count ?? 0);
    const allUsersTotal = Number(allUsersCountRows[0]?.count ?? 0);

    const postsModeration = moderationFromRows(postRows, {
      pending: ["pending"],
      approved: ["published"],
      rejected: ["rejected"],
      hidden: ["hidden"]
    });
    const commentsModeration = moderationFromRows(commentRows, {
      pending: ["pending"],
      approved: ["visible"],
      rejected: [],
      hidden: ["hidden"]
    });
    const reviewsModeration = moderationFromRows(reviewRows, {
      pending: ["pending"],
      approved: ["visible"],
      rejected: [],
      hidden: ["hidden"]
    });
    const submissionsModeration = moderationFromRows(submissionRows, {
      pending: ["submitted"],
      approved: ["approved"],
      rejected: ["rejected"],
      hidden: []
    });
    const brandApplicationsModeration = moderationFromRows(brandApplicationRows, {
      pending: ["pending"],
      approved: ["approved"],
      rejected: ["rejected"],
      hidden: ["hidden"]
    });
    const rankingItemsModeration = moderationFromRows(rankingItemRows, {
      pending: ["pending"],
      approved: ["published"],
      rejected: ["rejected"],
      hidden: ["hidden"]
    });

    const startOfToday = startOfUtcDay(now);
    const startOfTomorrow = addUtcDays(startOfToday, 1);
    const startOfMonth = startOfUtcMonth(now);
    const startOfNextMonth = addUtcMonths(startOfMonth, 1);
    const startOfYear = startOfUtcYear(now);
    const startOfNextYear = addUtcYears(startOfYear, 1);

    return {
      totals: {
        users: registrationRecords.length,
        moments,
        articles,
        aircraft,
        rankings,
        pendingTotal:
          postsModeration.pending +
          commentsModeration.pending +
          reviewsModeration.pending +
          submissionsModeration.pending,
        pendingPosts: postsModeration.pending,
        pendingComments: commentsModeration.pending,
        pendingReviews: reviewsModeration.pending,
        pendingSubmissions: submissionsModeration.pending,
        pendingBrandApplications: brandApplicationsModeration.pending,
        pendingRankingItems: rankingItemsModeration.pending
      },
      registration: {
        total: allUsersTotal,
        today: countPeriod(registrationRecords, startOfToday, startOfTomorrow),
        month: countPeriod(registrationRecords, startOfMonth, startOfNextMonth),
        year: countPeriod(registrationRecords, startOfYear, startOfNextYear),
        daily: buildDailyRegistrationSeries(registrationRecords, now),
        monthly: buildMonthlyRegistrationSeries(registrationRecords, now),
        yearly: buildYearlyRegistrationSeries(registrationRecords, now)
      },
      activity: {
        activeUsers: countSessionPeriod(allSessionRecords, startOfMonth, startOfNextMonth),
        dau: countSessionPeriod(sessionRecords, startOfToday, startOfTomorrow),
        mau: countSessionPeriod(sessionRecords, startOfMonth, startOfNextMonth),
        yau: countSessionPeriod(sessionRecords, startOfYear, startOfNextYear),
        daily: buildSessionSeries(sessionRecords, now, "day"),
        monthly: buildSessionSeries(sessionRecords, now, "month"),
        yearly: buildSessionSeries(sessionRecords, now, "year")
      },
      contentMix: {
        moments,
        articles,
        aircraft,
        rankings
      },
      content: {
        moments,
        articles,
        aircraftPublishedModels: aircraft,
        aircraftPendingSubmissions: submissionsModeration.pending,
        rankings
      },
      moderation: {
        posts: postsModeration,
        comments: commentsModeration,
        reviews: reviewsModeration,
        submissions: submissionsModeration,
        brandApplications: brandApplicationsModeration,
        rankingItems: rankingItemsModeration
      },
      funnel: {
        posts: buildFunnelBucket(postsModeration),
        comments: buildFunnelBucket(commentsModeration),
        reviews: buildFunnelBucket(reviewsModeration),
        submissions: buildFunnelBucket(submissionsModeration),
        brandApplications: buildFunnelBucket(brandApplicationsModeration),
        rankingItems: buildFunnelBucket(rankingItemsModeration)
      },
      series: {
        registrationDaily: buildDailyRegistrationSeries(registrationRecords, now),
        registrationMonthly: buildMonthlyRegistrationSeries(registrationRecords, now),
        registrationYearly: buildYearlyRegistrationSeries(registrationRecords, now),
        activityDaily: buildSessionSeries(sessionRecords, now, "day"),
        activityMonthly: buildSessionSeries(sessionRecords, now, "month"),
        activityYearly: buildSessionSeries(sessionRecords, now, "year")
      }
    };
  }
};
