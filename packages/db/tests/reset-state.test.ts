import { getTableName, isTable } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as schema from "../src/schema.js";
import { getResetTableNames } from "../src/seed.js";

describe("database reset state", () => {
  it("includes every schema table in the reset list", () => {
    const schemaTableNames = Object.values(schema)
      .filter(isTable)
      .map((table) => getTableName(table))
      .sort();

    expect(getResetTableNames().sort()).toEqual(schemaTableNames);
  });
});
