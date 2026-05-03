import { db, postsTable } from "@feijia/db";
import type { SQL } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildUserModelPreferenceBoostExpression,
} from "../src/modules/posts/posts.repo";
import { usersRepo } from "../src/modules/users/users.repo";
import { usersService } from "../src/modules/users/users.service";

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

const ORIG_PREFERENCE_BOOST_WEIGHT: string | undefined =
  process.env.RECOMMENDATION_PREFERENCE_BOOST_WEIGHT;

function clearPreferenceBoostEnv() {
  delete process.env.RECOMMENDATION_PREFERENCE_BOOST_WEIGHT;
}

function restorePreferenceBoostEnv() {
  const setOrDelete = (key: string, value: string | undefined) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  };
  setOrDelete("RECOMMENDATION_PREFERENCE_BOOST_WEIGHT", ORIG_PREFERENCE_BOOST_WEIGHT);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the SQL string and params from a SQL expression by using
 * db.select(...).toSQL(). This does NOT execute the query.
 */
function extractSqlInfo(expression: SQL): { sql: string; params: unknown[] } {
  const query = db.select({ value: expression }).from(postsTable);
  return query.toSQL();
}

// ---------------------------------------------------------------------------
// Tests: buildUserModelPreferenceBoostExpression
// ---------------------------------------------------------------------------

describe("buildUserModelPreferenceBoostExpression", () => {
  afterEach(() => {
    restorePreferenceBoostEnv();
  });

  it("returns 0 when currentUserId is null (unauthenticated user gets no boost)", () => {
    clearPreferenceBoostEnv();
    const expr = buildUserModelPreferenceBoostExpression(null);
    expect(expr).toBeTruthy();
    const { sql } = extractSqlInfo(expr);
    // Should be a simple literal, not a CASE expression
    expect(sql).toContain("0");
    // Should NOT contain the subquery keywords (since no user, no boost)
    expect(sql).not.toContain("aircraft_model_interactions");
  });

  it("returns 0 when currentUserId is undefined", () => {
    clearPreferenceBoostEnv();
    const expr = buildUserModelPreferenceBoostExpression(undefined);
    expect(expr).toBeTruthy();
    const { sql } = extractSqlInfo(expr);
    expect(sql).toContain("0");
    expect(sql).not.toContain("aircraft_model_interactions");
  });

  it("returns a CASE expression with EXISTS subquery when currentUserId is provided", () => {
    clearPreferenceBoostEnv();
    const expr = buildUserModelPreferenceBoostExpression("user_test_001");
    expect(expr).toBeTruthy();
    const { sql, params } = extractSqlInfo(expr);
    // Should contain the case/exists structure (drizzle generates lowercase SQL)
    expect(sql).toContain("case");
    expect(sql).toContain("exists");
    // Should reference the aircraft_model_interactions table
    expect(sql).toContain("aircraft_model_interactions");
    // Should reference the rating_targets table (approximate matching)
    expect(sql).toContain("rating_targets");
    // Should contain the user ID as a parameter
    expect(params).toContain("user_test_001");
    // Should contain the default boost weight (5) as a parameter (not inline in SQL)
    expect(params).toContain(5);
  });

  it("respects RECOMMENDATION_PREFERENCE_BOOST_WEIGHT env var with custom value", () => {
    clearPreferenceBoostEnv();
    process.env.RECOMMENDATION_PREFERENCE_BOOST_WEIGHT = "10";

    const expr = buildUserModelPreferenceBoostExpression("user_test_002");
    expect(expr).toBeTruthy();
    const { sql, params } = extractSqlInfo(expr);
    // Should contain the configured weight (10) as parameter
    expect(params).toContain(10);
    // Should NOT contain default weight 5 as parameter
    expect(params).not.toContain(5);
  });

  it("uses default weight 5 when RECOMMENDATION_PREFERENCE_BOOST_WEIGHT is empty string", () => {
    clearPreferenceBoostEnv();
    process.env.RECOMMENDATION_PREFERENCE_BOOST_WEIGHT = "";

    const expr = buildUserModelPreferenceBoostExpression("user_test_003");
    expect(expr).toBeTruthy();
    const { sql, params } = extractSqlInfo(expr);
    // Should use default weight 5 as a parameter
    expect(params).toContain(5);
  });

  it("uses default weight 5 when RECOMMENDATION_PREFERENCE_BOOST_WEIGHT is invalid", () => {
    clearPreferenceBoostEnv();
    process.env.RECOMMENDATION_PREFERENCE_BOOST_WEIGHT = "not-a-number";

    const expr = buildUserModelPreferenceBoostExpression("user_test_004");
    expect(expr).toBeTruthy();
    const { sql, params } = extractSqlInfo(expr);
    // Should use default weight 5 as a parameter
    expect(params).toContain(5);
  });

  it("does not include subquery references when currentUserId is null even with env var set", () => {
    process.env.RECOMMENDATION_PREFERENCE_BOOST_WEIGHT = "8";

    const expr = buildUserModelPreferenceBoostExpression(null);
    expect(expr).toBeTruthy();
    const { sql } = extractSqlInfo(expr);
    expect(sql).toContain("0");
    expect(sql).not.toContain("aircraft_model_interactions");
  });
});

// ---------------------------------------------------------------------------
// Tests: usersRepo.getUserModelPreferences
// ---------------------------------------------------------------------------

describe("usersRepo.getUserModelPreferences", () => {
  it("is a function on usersRepo", () => {
    expect(typeof usersRepo.getUserModelPreferences).toBe("function");
  });

  it("returns an empty array for a non-existent user (no crash)", async () => {
    const result = await usersRepo.getUserModelPreferences("non_existent_user_id");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: usersService.buildUserModelPreferenceVector
// ---------------------------------------------------------------------------

describe("usersService.buildUserModelPreferenceVector", () => {
  it("is a function on usersService", () => {
    expect(typeof usersService.buildUserModelPreferenceVector).toBe("function");
  });

  it("returns an empty array for a non-existent user (no crash)", async () => {
    const result = await usersService.buildUserModelPreferenceVector("non_existent_user_id");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});
