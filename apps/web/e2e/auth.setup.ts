import { test as setup } from "playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { loginAsSeededUser, seededUserStorageStatePath } from "./support/auth";

setup("prepare seeded user auth state", async ({ page }) => {
  await mkdir(dirname(seededUserStorageStatePath), { recursive: true });
  await loginAsSeededUser(page);
  await page.context().storageState({ path: seededUserStorageStatePath });
});
