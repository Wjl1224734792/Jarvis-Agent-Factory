export function buildDefaultCorsOrigins() {
  return ["http://localhost:17380", "http://localhost:17381"];
}

export function isAllowedDevCorsOrigin(_origin: string) {
  return true;
}
