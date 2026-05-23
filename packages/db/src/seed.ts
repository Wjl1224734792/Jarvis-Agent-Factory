import { eq, getTableName, isTable, or, sql } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";
import {
  aircraftCategoriesTable,
  contentCategoriesTable,
  devicesTable,
  filesTable,
  notificationsTable,
  powerTypesTable,
  postsTable,
  rolesTable,
  sessionsTable,
  siteSettingsTable,
  userSettingsTable,
  usersTable,
} from "./schema.js";
import { createId, hashPassword } from "./helpers.js";

const resetTableNames = Object.values(schema)
  .filter(isTable)
  .map((table) => getTableName(table))
  .sort();

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function getResetTableNames() {
  return [...resetTableNames];
}

function buildResetTableNames(
  tables: Array<(typeof schema)[keyof typeof schema]>
) {
  return tables
    .filter(isTable)
    .map((table) => getTableName(table))
    .sort();
}

const authResetTableNames = buildResetTableNames([
  devicesTable,
  filesTable,
  sessionsTable,
  userSettingsTable,
  usersTable
]);

const rankingsResetTableNames = buildResetTableNames([
  aircraftCategoriesTable,
  devicesTable,
  filesTable,
  notificationsTable,
  postsTable,
  sessionsTable,
  siteSettingsTable,
  userSettingsTable,
  usersTable
]);

const catalogResetTableNames = buildResetTableNames([
  aircraftCategoriesTable,
  contentCategoriesTable,
  devicesTable,
  filesTable,
  notificationsTable,
  postsTable,
  sessionsTable,
  siteSettingsTable,
  userSettingsTable,
  usersTable
]);

export type DatabaseResetProfile = "full" | "auth" | "rankings" | "catalog";

export function getResetTableNamesForProfile(
  profile: DatabaseResetProfile = "full"
) {
  if (profile === "auth") {
    return [...authResetTableNames];
  }

  if (profile === "rankings") {
    return [...rankingsResetTableNames];
  }

  if (profile === "catalog") {
    return [...catalogResetTableNames];
  }

  return getResetTableNames();
}

const CONTENT_CATEGORY_IDS = {
  news: "seed_ccat_news",
  tech: "seed_ccat_tech",
  review: "seed_ccat_review",
  guide: "seed_ccat_guide"
} as const;

const AIRCRAFT_CATEGORY_IDS = {
  drone: "seed_cat_drone",
  evtol: "seed_cat_evtol",
  helicopter: "seed_cat_helicopter",
  businessJet: "seed_cat_business_jet"
} as const;

function seededDate(day: number, hour: number, minute = 0) {
  return new Date(Date.UTC(2026, 2, day, hour, minute, 0));
}

async function ensureAdminUser() {
  const existing = await db
    .select({ id: usersTable.id, displayName: usersTable.displayName })
    .from(usersTable)
    .where(
      or(
        eq(usersTable.role, "admin"),
        eq(usersTable.account, "admin"),
        eq(usersTable.displayName, "系统管理员")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const adminPasswordHash = await hashPassword("Admin#123");
    await db
      .update(usersTable)
      .set({
        displayName: "系统管理员",
        account: "admin",
        passwordHash: adminPasswordHash,
        role: "admin"
      })
      .where(eq(usersTable.id, existing[0].id));
    return existing[0].id;
  }

  const id = createId("admin");
  const adminPasswordHash = await hashPassword("Admin#123");
  await db
    .insert(usersTable)
    .values({
      id,
      role: "admin",
      displayName: "系统管理员",
      phone: null,
      account: "admin",
      passwordHash: adminPasswordHash
    })
    .onConflictDoUpdate({
      target: usersTable.displayName,
      set: {
        role: "admin",
        account: "admin",
        passwordHash: adminPasswordHash,
        phone: null
      }
    });

  const refreshed = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.displayName, "系统管理员"))
    .limit(1);

  return refreshed[0]?.id ?? id;
}

async function seedContentCategories() {
  await db
    .insert(contentCategoriesTable)
    .values([
      { id: CONTENT_CATEGORY_IDS.news, slug: "news", name: "资讯", sortOrder: 1, isEnabled: true },
      { id: CONTENT_CATEGORY_IDS.tech, slug: "tech", name: "技术", sortOrder: 2, isEnabled: true },
      { id: CONTENT_CATEGORY_IDS.review, slug: "review", name: "测评", sortOrder: 3, isEnabled: true },
      { id: CONTENT_CATEGORY_IDS.guide, slug: "guide", name: "指南", sortOrder: 4, isEnabled: true }
    ])
    .onConflictDoNothing();
}

async function seedAircraftCategories() {
  await db
    .insert(aircraftCategoriesTable)
    .values([
      { id: AIRCRAFT_CATEGORY_IDS.drone, slug: "drone", name: "无人机", sortOrder: 1, isEnabled: true },
      { id: AIRCRAFT_CATEGORY_IDS.evtol, slug: "evtol", name: "电动垂直起降", sortOrder: 2, isEnabled: true },
      { id: AIRCRAFT_CATEGORY_IDS.helicopter, slug: "helicopter", name: "直升机", sortOrder: 3, isEnabled: true },
      { id: AIRCRAFT_CATEGORY_IDS.businessJet, slug: "business-jet", name: "公务机", sortOrder: 4, isEnabled: true }
    ])
    .onConflictDoNothing();
}

async function seedPowerTypes() {
  await db
    .insert(powerTypesTable)
    .values([
      { id: "seed_pwt_electric", slug: "electric", name: "电动", sortOrder: 1, isEnabled: true },
      { id: "seed_pwt_fuel", slug: "fuel", name: "燃油", sortOrder: 2, isEnabled: true },
      { id: "seed_pwt_hybrid", slug: "hybrid", name: "混动", sortOrder: 3, isEnabled: true },
      { id: "seed_pwt_other", slug: "other", name: "其他", sortOrder: 4, isEnabled: true }
    ])
    .onConflictDoNothing();
}

async function seedRoles() {
  await db
    .insert(rolesTable)
    .values([
      { name: "super_admin", label: "超级管理员", permissions: ["*"], description: "拥有系统全部权限" },
      { name: "editor", label: "内容编辑", permissions: ["content:*", "overview:view", "messages:view", "settings:security"], description: "负责内容创建与编辑" },
      { name: "moderator", label: "审核员", permissions: ["moderation:*", "overview:view", "messages:view", "settings:security"], description: "负责内容审核与社区管理" },
      { name: "operator", label: "运营专员", permissions: ["operations:*", "overview:view", "messages:view", "settings:security"], description: "负责运营活动与数据管理" },
    ])
    .onConflictDoNothing();
}

async function seedRoleUsers() {
  const testPwd = await hashPassword("Test#123");
  await db
    .insert(usersTable)
    .values([
      { id: createId("user"), role: "editor", displayName: "内容编辑测试", phone: "13900139001", account: "editor", passwordHash: testPwd },
      { id: createId("user"), role: "moderator", displayName: "审核员测试", phone: "13900139002", account: "moderator", passwordHash: testPwd },
      { id: createId("user"), role: "operator", displayName: "运营专员测试", phone: "13900139003", account: "operator", passwordHash: testPwd },
    ])
    .onConflictDoNothing();
}

async function seedSiteSettings() {
  await db
    .insert(siteSettingsTable)
    .values({
      id: "seed_site_settings_default",
      postModerationEnabled: true,
      commentModerationEnabled: false,
      reviewModerationEnabled: false,
      submissionModerationEnabled: true,
      rankingModerationEnabled: false,
      articleModerationEnabled: true,
      momentModerationEnabled: true,
      brandModerationEnabled: true,
      modelModerationEnabled: true,
      ratingTargetModerationEnabled: true
    })
    .onConflictDoNothing();
}

export async function resetDatabaseState(options?: {
  profile?: DatabaseResetProfile;
}) {
  const tableNames = getResetTableNamesForProfile(options?.profile ?? "full");
  await db.execute(
    sql.raw(
      `TRUNCATE TABLE ${tableNames.map(quoteIdentifier).join(", ")} RESTART IDENTITY CASCADE;`
    )
  );
}

export async function seedAuthDatabase() {
  await ensureAdminUser();
  await seedRoles();
  await seedRoleUsers();
}

export async function seedBaseDatabase(options?: { reset?: boolean }) {
  if (options?.reset !== false) {
    await resetDatabaseState();
  }
  await ensureAdminUser();
  await seedContentCategories();
  await seedAircraftCategories();
  await seedPowerTypes();
}

async function seedBaseInfrastructure() {
  await seedSiteSettings();
}

export async function seedDemoDatabase(options?: { reset?: boolean }) {
  await seedBaseDatabase(options);
  await seedBaseInfrastructure();
  await seedRoles();
  await seedRoleUsers();
}

export async function seedRankingsDatabase(options?: { reset?: boolean }) {
  await seedBaseDatabase(options);
  await seedBaseInfrastructure();
  await seedRoles();
  await seedRoleUsers();
}

type SeedDatabaseProfile = "demo" | "catalog" | "rankings";

export async function seedDatabase(options?: { reset?: boolean; profile?: SeedDatabaseProfile }) {
  if (options?.profile === "catalog") {
    await seedBaseDatabase(options);
    await seedBaseInfrastructure();
    return;
  }

  if (options?.profile === "rankings") {
    await seedRankingsDatabase(options);
    return;
  }

  await seedDemoDatabase(options);
}
