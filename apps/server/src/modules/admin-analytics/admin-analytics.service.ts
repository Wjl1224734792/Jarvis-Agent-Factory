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
import { and, eq, gte, inArray, sql } from "drizzle-orm";

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

type ModerationCountRow = {
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

function toModerationBucket(row: ModerationCountRow | undefined): ModerationBucket {
  return {
    queueEntered: Number(row?.queueEntered ?? 0),
    pending: Number(row?.pending ?? 0),
    approved: Number(row?.approved ?? 0),
    rejected: Number(row?.rejected ?? 0),
    hidden: Number(row?.hidden ?? 0)
  };
}

/**
 * Produces the admin dashboard overview from database aggregates plus bounded
 * activity series so the route can stay schema-focused and side-effect free.
 */
export const adminAnalyticsService = {
  async getOverview() {
    const now = new Date();
    // Daily/monthly/yearly charts only render the trailing 30d/12m/5y windows,
    // so trimming source rows here avoids scanning historical tables on every refresh.
    const seriesWindowStart = addUtcYears(startOfUtcYear(now), -4);
    const [
      users,
      sessions,
      allSessions,
      postMetricsRows,
      commentMetricsRows,
      reviewMetricsRows,
      submissionMetricsRows,
      rankingMetricsRows,
      brandApplicationMetricsRows,
      ratingTargetMetricsRows,
      allUsersCountRows,
      rankingsCountRows,
      publishedModelsCountRows
    ] = await Promise.all([
      db
        .select({
          createdAt: usersTable.createdAt
        })
        .from(usersTable)
        .where(and(eq(usersTable.role, "user"), gte(usersTable.createdAt, seriesWindowStart))),
      db
        .select({
          userId: sessionsTable.userId,
          createdAt: sessionsTable.createdAt
        })
        .from(sessionsTable)
        .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
        .where(
          and(
            inArray(sessionsTable.scope, ["web", "app"]),
            eq(usersTable.role, "user"),
            gte(sessionsTable.createdAt, seriesWindowStart)
          )
        ),
      db
        .select({
          userId: sessionsTable.userId,
          createdAt: sessionsTable.createdAt
        })
        .from(sessionsTable)
        .where(gte(sessionsTable.createdAt, seriesWindowStart)),
      db
        .select({
          queueEntered: sql<number>`count(*)`,
          articles: sql<number>`count(*) filter (where ${postsTable.type} = 'article')`,
          moments: sql<number>`count(*) filter (where ${postsTable.type} = 'moment')`,
          pending: sql<number>`count(*) filter (where ${postsTable.status} = 'pending')`,
          approved: sql<number>`count(*) filter (where ${postsTable.status} = 'published')`,
          rejected: sql<number>`count(*) filter (where ${postsTable.status} = 'rejected')`,
          hidden: sql<number>`count(*) filter (where ${postsTable.status} = 'hidden')`
        })
        .from(postsTable),
      db
        .select({
          queueEntered: sql<number>`count(*)`,
          pending: sql<number>`count(*) filter (where ${postCommentsTable.status} = 'pending')`,
          approved: sql<number>`count(*) filter (where ${postCommentsTable.status} = 'visible')`,
          rejected: sql<number>`0`,
          hidden: sql<number>`count(*) filter (where ${postCommentsTable.status} = 'hidden')`
        })
        .from(postCommentsTable),
      db
        .select({
          queueEntered: sql<number>`count(*)`,
          pending: sql<number>`count(*) filter (where ${aircraftReviewsTable.status} = 'pending')`,
          approved: sql<number>`count(*) filter (where ${aircraftReviewsTable.status} = 'visible')`,
          rejected: sql<number>`0`,
          hidden: sql<number>`count(*) filter (where ${aircraftReviewsTable.status} = 'hidden')`
        })
        .from(aircraftReviewsTable),
      db
        .select({
          queueEntered: sql<number>`count(*)`,
          pending: sql<number>`count(*) filter (where ${aircraftSubmissionsTable.status} = 'submitted')`,
          approved: sql<number>`count(*) filter (where ${aircraftSubmissionsTable.status} = 'approved')`,
          rejected: sql<number>`count(*) filter (where ${aircraftSubmissionsTable.status} = 'rejected')`,
          hidden: sql<number>`0`
        })
        .from(aircraftSubmissionsTable),
      db
        .select({
          queueEntered: sql<number>`count(*)`,
          pending: sql<number>`count(*) filter (where ${rankingsTable.status} = 'pending')`,
          approved: sql<number>`count(*) filter (where ${rankingsTable.status} = 'published')`,
          rejected: sql<number>`count(*) filter (where ${rankingsTable.status} = 'rejected')`,
          hidden: sql<number>`count(*) filter (where ${rankingsTable.status} = 'hidden')`
        })
        .from(rankingsTable),
      db
        .select({
          queueEntered: sql<number>`count(*)`,
          pending: sql<number>`count(*) filter (where ${brandApplicationsTable.status} = 'pending')`,
          approved: sql<number>`count(*) filter (where ${brandApplicationsTable.status} = 'approved')`,
          rejected: sql<number>`count(*) filter (where ${brandApplicationsTable.status} = 'rejected')`,
          hidden: sql<number>`0`
        })
        .from(brandApplicationsTable),
      db
        .select({
          queueEntered: sql<number>`count(*)`,
          pending: sql<number>`count(*) filter (where ${ratingTargetsTable.status} = 'pending')`,
          approved: sql<number>`count(*) filter (where ${ratingTargetsTable.status} = 'published')`,
          rejected: sql<number>`count(*) filter (where ${ratingTargetsTable.status} = 'rejected')`,
          hidden: sql<number>`count(*) filter (where ${ratingTargetsTable.status} = 'hidden')`
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
    const postMetrics = postMetricsRows[0];
    const articles = Number(postMetrics?.articles ?? 0);
    const moments = Number(postMetrics?.moments ?? 0);
    const aircraft = Number(publishedModelsCountRows[0]?.count ?? 0);
    const rankings = Number(rankingsCountRows[0]?.count ?? 0);
    const allUsersTotal = Number(allUsersCountRows[0]?.count ?? 0);

    const postsModeration = toModerationBucket(postMetrics);
    const commentsModeration = toModerationBucket(commentMetricsRows[0]);
    const reviewsModeration = toModerationBucket(reviewMetricsRows[0]);
    const submissionsModeration = toModerationBucket(submissionMetricsRows[0]);
    const rankingsModeration = toModerationBucket(rankingMetricsRows[0]);
    const brandApplicationsModeration = toModerationBucket(brandApplicationMetricsRows[0]);
    const rankingItemsModeration = toModerationBucket(ratingTargetMetricsRows[0]);

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
          submissionsModeration.pending +
          rankingsModeration.pending +
          brandApplicationsModeration.pending +
          rankingItemsModeration.pending,
        pendingPosts: postsModeration.pending,
        pendingComments: commentsModeration.pending,
        pendingReviews: reviewsModeration.pending,
        pendingSubmissions: submissionsModeration.pending,
        pendingRankings: rankingsModeration.pending,
        pendingBrandApplications: brandApplicationsModeration.pending,
        pendingRatingTargets: rankingItemsModeration.pending
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
        rankings: rankingsModeration,
        brandApplications: brandApplicationsModeration,
        ratingTargets: rankingItemsModeration
      },
      funnel: {
        posts: buildFunnelBucket(postsModeration),
        comments: buildFunnelBucket(commentsModeration),
        reviews: buildFunnelBucket(reviewsModeration),
        submissions: buildFunnelBucket(submissionsModeration),
        rankings: buildFunnelBucket(rankingsModeration),
        brandApplications: buildFunnelBucket(brandApplicationsModeration),
        ratingTargets: buildFunnelBucket(rankingItemsModeration)
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
