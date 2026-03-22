import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    role: text("role").notNull(),
    displayName: text("display_name").notNull(),
    phone: text("phone"),
    account: text("account"),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    phoneUnique: uniqueIndex("users_phone_unique").on(table.phone),
    accountUnique: uniqueIndex("users_account_unique").on(table.account)
  })
);

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  scope: text("scope").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});

export const aircraftCategoriesTable = pgTable(
  "aircraft_categories",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    slugUnique: uniqueIndex("aircraft_categories_slug_unique").on(table.slug)
  })
);

export const brandsTable = pgTable(
  "brands",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    categoryId: text("category_id").references(() => aircraftCategoriesTable.id, {
      onDelete: "set null"
    }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    slugUnique: uniqueIndex("brands_slug_unique").on(table.slug)
  })
);

export const aircraftModelsTable = pgTable(
  "aircraft_models",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => aircraftCategoriesTable.id, { onDelete: "restrict" }),
    brandId: text("brand_id")
      .notNull()
      .references(() => brandsTable.id, { onDelete: "restrict" }),
    powerType: text("power_type").notNull(),
    summary: text("summary"),
    isPublished: boolean("is_published").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => ({
    slugUnique: uniqueIndex("aircraft_models_slug_unique").on(table.slug)
  })
);
