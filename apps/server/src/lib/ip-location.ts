import { existsSync } from "node:fs";
import { isIP } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  IPv4,
  loadContentFromFile,
  newWithBuffer,
  type Searcher
} from "ip2region.js";
import { logger } from "./logger";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IP2REGION_XDB_PATH = join(__dirname, "..", "..", "data", "ip2region", "ip2region_v4.xdb");
const countryDisplayNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["zh-CN"], { type: "region" })
    : null;

const IP_LOCATION_CACHE_MAX_ENTRIES = 2048;
const ipLocationCache = new Map<string, string | null>();

let cachedSearcher: Searcher | null = null;
let initFailureLogged = false;

const chinaCountryNames = new Set(["中国", "中华人民共和国", "China"]);
const unknownSegments = new Set(["", "0", "-", "--"]);

function isUnknownSegment(value: string | null | undefined) {
  return !value || unknownSegments.has(value.trim());
}

function trimDelimitedSegment(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function isLocalOrPrivateIPv4(ip: string) {
  const parts = ip.split(".").map((segment) => Number(segment));
  if (parts.length !== 4 || parts.some((segment) => !Number.isInteger(segment))) {
    return true;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}

function isLocalOrPrivateIPv6(ip: string) {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  );
}

function localizeCountry(code: string | null | undefined) {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || normalized.length !== 2) {
    return null;
  }

  try {
    return countryDisplayNames?.of(normalized) ?? null;
  } catch {
    return null;
  }
}

function rememberCachedLabel(ip: string, label: string | null) {
  if (ipLocationCache.size >= IP_LOCATION_CACHE_MAX_ENTRIES) {
    const firstKey = ipLocationCache.keys().next().value;
    if (typeof firstKey === "string") {
      ipLocationCache.delete(firstKey);
    }
  }

  ipLocationCache.set(ip, label);
}

function getSearcher() {
  if (cachedSearcher) {
    return cachedSearcher;
  }

  if (!existsSync(IP2REGION_XDB_PATH)) {
    throw new Error(`ip2region xdb file is missing at ${IP2REGION_XDB_PATH}`);
  }

  const contentBuffer = loadContentFromFile(IP2REGION_XDB_PATH);
  cachedSearcher = newWithBuffer(IPv4, contentBuffer);
  return cachedSearcher;
}

export function normalizeClientIp(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  let normalized = trimmed;

  if (normalized.startsWith("[")) {
    const closingIndex = normalized.indexOf("]");
    if (closingIndex > 1) {
      normalized = normalized.slice(1, closingIndex);
    }
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(normalized)) {
    normalized = normalized.slice(0, normalized.lastIndexOf(":"));
  }

  if (normalized.toLowerCase().startsWith("::ffff:")) {
    normalized = normalized.slice(7);
  }

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    return isLocalOrPrivateIPv4(normalized) ? null : normalized;
  }

  if (ipVersion === 6) {
    return isLocalOrPrivateIPv6(normalized) ? null : null;
  }

  return null;
}

export function formatPublicIpLocationLabel(region: string | null | undefined) {
  const raw = region?.trim();
  if (!raw) {
    return null;
  }

  const parts = raw.split("|").map((part) => trimDelimitedSegment(part));
  const country = parts.find((part) => !isUnknownSegment(part)) ?? "";
  if (!country || isUnknownSegment(country)) {
    return null;
  }

  const countryCode = localizeCountry(parts.at(-1));
  if (!chinaCountryNames.has(country)) {
    return countryCode ?? country;
  }

  const province =
    parts.slice(1, 3).find((part) => !isUnknownSegment(part)) ??
    parts.slice(1).find((part) => !isUnknownSegment(part)) ??
    "";

  return province || "中国";
}

export async function resolveIpLocationLabel(clientIp: string | null | undefined) {
  const normalizedIp = normalizeClientIp(clientIp);
  if (!normalizedIp) {
    return null;
  }

  if (ipLocationCache.has(normalizedIp)) {
    return ipLocationCache.get(normalizedIp) ?? null;
  }

  try {
    const region = await Promise.resolve(getSearcher().search(normalizedIp));
    const label = formatPublicIpLocationLabel(region);
    rememberCachedLabel(normalizedIp, label);
    return label;
  } catch (error) {
    if (!initFailureLogged) {
      initFailureLogged = true;
      logger.error("Failed to resolve ip location label.", {
        error: error instanceof Error ? error.message : String(error),
        path: IP2REGION_XDB_PATH
      });
    }
    rememberCachedLabel(normalizedIp, null);
    return null;
  }
}
