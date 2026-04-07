import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: resolve(process.cwd(), "../../.env")
});

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://user:qwertyuiop@localhost:5432/feijia";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl
  }
});
