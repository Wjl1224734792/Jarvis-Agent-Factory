export function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

export function restoreEnvValues(entries: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(entries)) {
    restoreEnvValue(key, value);
  }
}
