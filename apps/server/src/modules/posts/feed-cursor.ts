const FEED_CURSOR_PREFIX = 'seek:';
export const FEED_CURSOR_VERSION = 1;

type FeedCursorPayload =
  | {
      v: typeof FEED_CURSOR_VERSION;
      t: 'feed';
      p: string;
      i: string;
    }
  | {
      v: typeof FEED_CURSOR_VERSION;
      t: 'recommended';
      s: number;
      n: string;
      p: string;
      i: string;
    };

type FeedCursorState =
  | {
      kind: 'feed';
      publishedAt: Date;
      id: string;
    }
  | {
      kind: 'recommended';
      score: number;
      recommendationNow: Date;
      publishedAt: Date;
      id: string;
    };

function parseCursorDate(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * 解析 feed 游标字符串。
 *
 * @param cursor 客户端传回的分页游标。
 * @returns 合法游标时返回结构化状态，否则返回 `null`。
 * @throws {never} 非法游标会直接回退为 `null`，不会主动抛出异常。
 */
export function decodeFeedCursor(
  cursor: string | undefined
): FeedCursorState | null {
  if (!cursor) {
    return null;
  }

  const normalized = cursor.trim();
  if (!normalized.startsWith(FEED_CURSOR_PREFIX)) {
    return null;
  }

  const encodedPayload = normalized.slice(FEED_CURSOR_PREFIX.length);
  if (!encodedPayload) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as {
      v?: unknown;
      t?: unknown;
      s?: unknown;
      n?: unknown;
      p?: unknown;
      i?: unknown;
    };

    if (payload.v !== FEED_CURSOR_VERSION || typeof payload.t !== 'string') {
      return null;
    }

    const publishedAt = parseCursorDate(payload.p);
    if (!publishedAt || typeof payload.i !== 'string' || payload.i.length === 0) {
      return null;
    }

    if (payload.t === 'feed') {
      return {
        kind: 'feed' as const,
        publishedAt,
        id: payload.i
      };
    }

    if (
      payload.t === 'recommended' &&
      typeof payload.s === 'number' &&
      Number.isFinite(payload.s)
    ) {
      const recommendationNow = parseCursorDate(payload.n);
      if (!recommendationNow) {
        return null;
      }

      return {
        kind: 'recommended' as const,
        score: payload.s,
        recommendationNow,
        publishedAt,
        id: payload.i
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 编码 feed 游标负载。
 *
 * @param payload 需要返回给客户端的游标负载。
 * @returns 可直接透传给客户端的游标字符串。
 * @throws {never} 该函数只做 JSON 编码，不会主动抛出异常。
 */
export function encodeFeedCursor(payload: FeedCursorPayload) {
  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    'utf8'
  ).toString('base64url');

  return `${FEED_CURSOR_PREFIX}${encodedPayload}`;
}

/**
 * 解析列表项用于分页定位的时间字段。
 *
 * @param item 含 `publishedAt/createdAt` 的列表项。
 * @returns 优先使用 `publishedAt`，为空时回退到 `createdAt`。
 * @throws {never} 该函数只做空值回退，不会主动抛出异常。
 */
export function resolveFeedCursorTime(item: {
  publishedAt: Date | null;
  createdAt: Date;
}) {
  return item.publishedAt ?? item.createdAt;
}
