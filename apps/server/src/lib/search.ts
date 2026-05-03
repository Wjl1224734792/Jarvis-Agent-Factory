import { or, sql, type SQL, type SQLWrapper } from "drizzle-orm";

export type MatchDescriptor = {
  matchedField: string;
  score: number;
};

export type SearchPatterns = {
  exact: string;
  prefix: string;
  contains: string;
};

export function escapeLikePattern(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function buildSearchPatterns(query: string): SearchPatterns {
  const exact = query.trim();
  const escaped = escapeLikePattern(exact);

  return {
    exact,
    prefix: `${escaped}%`,
    contains: `%${escaped}%`
  };
}

function asText(field: SQLWrapper) {
  return sql<string>`coalesce(${field}::text, '')`;
}

export function buildIlikeAnyCondition(
  fields: SQLWrapper[],
  containsPattern: string
): SQL | undefined {
  const conditions = fields.map((field) => sql`${asText(field)} ilike ${containsPattern} escape '\\'`);
  return conditions.length > 0 ? or(...conditions) ?? undefined : undefined;
}

export function buildMatchRankSql(
  fields: SQLWrapper[],
  patterns: SearchPatterns
): SQL<number> {
  const ranks = fields.map((field) => {
    const textField = asText(field);
    return sql<number>`
      case
        when lower(${textField}) = lower(${patterns.exact}) then 3
        when lower(${textField}) like lower(${patterns.prefix}) escape '\\' then 2
        when ${textField} ilike ${patterns.contains} escape '\\' then 1
        else 0
      end
    `;
  });

  if (ranks.length === 0) {
    return sql<number>`0`;
  }

  if (ranks.length === 1) {
    return ranks[0] ?? sql<number>`0`;
  }

  return sql<number>`greatest(${sql.join(ranks, sql`, `)})`;
}

export function resolveMatchedField(
  query: string,
  fields: Array<{ field: string; value: string | null | undefined }>
): MatchDescriptor {
  const normalizedQuery = query.trim().toLowerCase();
  let bestMatch: MatchDescriptor = {
    matchedField: "title",
    score: 0
  };

  for (const entry of fields) {
    const normalizedValue = entry.value?.trim().toLowerCase() ?? "";
    if (!normalizedValue) {
      continue;
    }

    let score = 0;
    if (normalizedValue === normalizedQuery) {
      score = 300;
    } else if (normalizedValue.startsWith(normalizedQuery)) {
      score = 200;
    } else if (normalizedValue.includes(normalizedQuery)) {
      score = 100;
    }

    if (score > bestMatch.score) {
      bestMatch = {
        matchedField: entry.field,
        score
      };
    }
  }

  return bestMatch;
}

export function truncateSearchText(
  value: string | null | undefined,
  limit = 140
): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!normalized) {
    return null;
  }

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}
