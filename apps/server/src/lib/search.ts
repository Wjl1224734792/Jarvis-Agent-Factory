import { or, sql, type SQL, type SQLWrapper } from 'drizzle-orm';

interface MatchDescriptor {
  matchedField: string;
  score: number;
}

interface SearchPatterns {
  exact: string;
  prefix: string;
  contains: string;
}

interface SearchFieldCandidate {
  field: string;
  value: string | null | undefined;
}

interface MatchScoreRule {
  score: number;
  matches: (value: string, query: string) => boolean;
}

const MATCH_SCORE_RULES: readonly MatchScoreRule[] = [
  { score: 300, matches: (value, query) => value === query },
  { score: 200, matches: (value, query) => value.startsWith(query) },
  { score: 100, matches: (value, query) => value.includes(query) }
];

/**
 * 对 `LIKE/ILIKE` 查询中的通配符进行转义。
 *
 * @param value 用户输入的原始查询词。
 * @returns 适合拼接到 SQL 模糊查询中的转义结果。
 * @throws {never} 该函数只做纯字符串替换，不会抛出异常。
 */
export function escapeLikePattern(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * 生成搜索模块统一使用的精确、前缀与包含匹配模式。
 *
 * @param query 用户输入的查询词。
 * @returns 标准化后的搜索模式对象。
 * @throws {never} 该函数只做纯字符串处理，不会抛出异常。
 */
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

/**
 * 构建多字段 `ILIKE` 任一匹配条件。
 *
 * @param fields 需要参与搜索的 SQL 字段列表。
 * @param containsPattern 已转义的 `%keyword%` 模式。
 * @returns 可直接拼接到 Drizzle 查询中的 `SQL` 条件；无字段时返回 `undefined`。
 * @throws {never} 无字段时会直接返回 `undefined`，不会主动抛出异常。
 */
export function buildIlikeAnyCondition(
  fields: SQLWrapper[],
  containsPattern: string
): SQL | undefined {
  const conditions = fields.map(field =>
    sql`${asText(field)} ilike ${containsPattern} escape '\\'`
  );

  return conditions.length > 0 ? or(...conditions) ?? undefined : undefined;
}

/**
 * 构建搜索结果排序所需的匹配分数 SQL。
 *
 * @param fields 需要参与匹配评分的 SQL 字段列表。
 * @param patterns 搜索模式集合。
 * @returns 用于 `order by` 或投影字段的评分 SQL。
 * @throws {never} 无字段时返回常量 `0`，不会主动抛出异常。
 */
export function buildMatchRankSql(
  fields: SQLWrapper[],
  patterns: SearchPatterns
): SQL<number> {
  const ranks = fields.map(field => {
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

function resolveMatchScore(value: string, normalizedQuery: string) {
  const matchedRule = MATCH_SCORE_RULES.find(rule =>
    rule.matches(value, normalizedQuery)
  );

  return matchedRule?.score ?? 0;
}

/**
 * 解析一条结果命中了哪个字段以及命中强度。
 *
 * @param query 用户原始查询词。
 * @param fields 候选字段和值列表。
 * @returns 最优命中的字段描述；未命中时返回默认分数 `0`。
 * @throws {never} 候选值为空时会跳过，不会主动抛出异常。
 */
export function resolveMatchedField(
  query: string,
  fields: SearchFieldCandidate[]
): MatchDescriptor {
  const normalizedQuery = query.trim().toLowerCase();
  let bestMatch: MatchDescriptor = {
    matchedField: 'title',
    score: 0
  };

  for (const entry of fields) {
    const normalizedValue = entry.value?.trim().toLowerCase() ?? '';
    if (!normalizedValue) {
      continue;
    }

    const score = resolveMatchScore(normalizedValue, normalizedQuery);
    if (score > bestMatch.score) {
      bestMatch = {
        matchedField: entry.field,
        score
      };
    }
  }

  return bestMatch;
}

/**
 * 按统一长度裁剪搜索摘要文本。
 *
 * @param value 原始文本内容。
 * @param limit 最大保留长度，默认 `140`。
 * @returns 归一化后的摘要文本；空值返回 `null`。
 * @throws {never} 该函数只做纯字符串处理，不会抛出异常。
 */
export function truncateSearchText(
  value: string | null | undefined,
  limit = 140
): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (!normalized) {
    return null;
  }

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}
