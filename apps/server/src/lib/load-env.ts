import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let envLoaded = false;

function applyEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const normalizedValue =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
        ? value.slice(1, -1)
        : value;

    process.env[key] = normalizedValue;
  }
}

export function ensureServerEnvLoaded() {
  if (envLoaded) {
    return;
  }

  applyEnvFile(resolve(process.cwd(), ".env"));
  applyEnvFile(resolve(process.cwd(), "..", ".env"));
  applyEnvFile(resolve(process.cwd(), "..", "..", ".env"));
  envLoaded = true;
}
