export type MasonryColumnCell<T> = {
  item: T;
  absoluteIndex: number;
};

function normalizeColumnCount(columnCount: number): number {
  return Math.max(1, Math.floor(columnCount));
}

/**
 * 按估算高度放入当前最短列（与飞友圈 partitionCircleFeedShortestColumn 同算法）。
 */
export function partitionByShortestColumn<T>(
  items: T[],
  columnCount: number,
  estimateHeight: (item: T, absoluteIndex: number) => number
): MasonryColumnCell<T>[][] {
  const n = normalizeColumnCount(columnCount);
  const columns: MasonryColumnCell<T>[][] = Array.from({ length: n }, () => []);
  const scores: number[] = Array.from({ length: n }, () => 0);

  for (let absoluteIndex = 0; absoluteIndex < items.length; absoluteIndex += 1) {
    let targetCol = 0;
    let minScore = scores[0] ?? 0;
    for (let c = 1; c < n; c += 1) {
      const s = scores[c];
      if (s !== undefined && s < minScore) {
        minScore = s;
        targetCol = c;
      }
    }

    const item = items[absoluteIndex];
    if (item === undefined) {
      continue;
    }

    const col = columns[targetCol];
    if (!col) {
      continue;
    }

    col.push({
      item,
      absoluteIndex
    });
    const prev = scores[targetCol] ?? 0;
    scores[targetCol] = prev + estimateHeight(item, absoluteIndex);
  }

  return columns;
}
