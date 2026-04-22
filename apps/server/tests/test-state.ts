import {
  resetDatabaseState,
  seedAuthDatabase,
  seedDatabase
} from "@feijia/db";
import { authRepo } from "../src/modules/auth/auth.repo";
import { resetRedisForTesting } from "../src/modules/auth/redis-client";

type IntegrationSeedProfile = "auth" | "demo" | "catalog";

async function seedByProfile(profile: IntegrationSeedProfile) {
  if (profile === "auth") {
    await seedAuthDatabase();
    return;
  }

  if (profile === "catalog") {
    await seedDatabase({
      profile: "catalog",
      reset: false
    });
    return;
  }

  await seedDatabase({ reset: false });
}

export async function resetIntegrationState(
  profile: IntegrationSeedProfile,
  options?: { attempts?: number }
) {
  const attempts = Math.max(1, options?.attempts ?? 3);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await resetRedisForTesting();
      authRepo.resetEphemeralState();
      await resetDatabaseState();
      await seedByProfile(profile);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
