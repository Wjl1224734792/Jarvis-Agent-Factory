import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject
} from "react";
import {
  CIRCLE_CARD_COLUMN_GAP_PX,
  CIRCLE_FEED_MAX_COLUMNS,
  CIRCLE_FEED_MIN_COLUMNS,
  getCircleColumnCount
} from "@/routes/circle-page-helpers";

export type UseCircleColumnCountOptions = {
  /** 传入时用其内容宽度推算列数（飞友圈等真实内容区），避免仅用视口宽度与侧栏/内边距不一致 */
  widthElementRef?: RefObject<HTMLElement | null>;
  /** 最小列数，默认与飞友圈一致为 2；榜单页可传 1 允许单列 */
  minColumns?: number;
  /**
   * 单列目标最小宽度（px）。若设置，列数不超过 `floor((width+gap)/(minTrackWidthPx+gap))`，
   * 配合 `minmax(0,1fr)` 可避免网格撑出容器而出现横向滚动条（榜单页与 RANKING_CARD_MIN_WIDTH_PX 对齐）。
   */
  minTrackWidthPx?: number;
};

function capColumnCountByMinTrackWidth(
  basisPx: number,
  columnCount: number,
  minTrackWidthPx: number | undefined
): number {
  if (minTrackWidthPx === undefined || basisPx <= 0) {
    return columnCount;
  }

  const maxColsByMinTrack = Math.max(
    1,
    Math.floor((basisPx + CIRCLE_CARD_COLUMN_GAP_PX) / (minTrackWidthPx + CIRCLE_CARD_COLUMN_GAP_PX))
  );
  return Math.min(columnCount, maxColsByMinTrack);
}

function getInitialCircleColumnCount(minColumns: number, minTrackWidthPx?: number) {
  const fallback = Math.min(Math.max(1, minColumns), CIRCLE_FEED_MAX_COLUMNS);
  if (typeof window === "undefined") {
    return fallback;
  }

  const w = window.innerWidth;
  const raw = getCircleColumnCount(w, minColumns);
  return capColumnCountByMinTrackWidth(w, raw, minTrackWidthPx);
}

/**
 * 与飞友圈列表一致的响应式列数。
 * - 传入 `override` 时固定使用该值且不监听尺寸。
 * - 传入 `widthElementRef` 时用 ResizeObserver 测量容器宽度；宽度为 0 时回退到 `window.innerWidth`。
 * - 否则用 `window.innerWidth` + resize。
 * - resize / ResizeObserver 回调经 requestAnimationFrame 合并，减少连续布局时重复 setState；列数未变时不更新。
 */
export function useCircleColumnCount(override?: number, options?: UseCircleColumnCountOptions) {
  const widthElementRef = options?.widthElementRef;
  const minColumns = options?.minColumns ?? CIRCLE_FEED_MIN_COLUMNS;
  const minTrackWidthPx = options?.minTrackWidthPx;
  const minColumnsRef = useRef(minColumns);
  minColumnsRef.current = minColumns;
  const minTrackWidthPxRef = useRef(minTrackWidthPx);
  minTrackWidthPxRef.current = minTrackWidthPx;

  const [columnCount, setColumnCount] = useState(() =>
    typeof override === "number" ? override : getInitialCircleColumnCount(minColumns, minTrackWidthPx)
  );

  /** 与 state 同步，便于 resize 回调中若列数未变则完全跳过 startTransition */
  const columnCountRef = useRef(columnCount);
  columnCountRef.current = columnCount;

  const rafIdRef = useRef<number | null>(null);
  const resizeObserverWidthRef = useRef(0);

  function cancelScheduledRaf() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }

  function commitColumnCount(basisPx: number) {
    let basis = basisPx;
    if (basis <= 0 && typeof window !== "undefined") {
      basis = window.innerWidth;
    }
    const raw = getCircleColumnCount(basis, minColumnsRef.current);
    const next = capColumnCountByMinTrackWidth(basis, raw, minTrackWidthPxRef.current);
    if (next === columnCountRef.current) {
      return;
    }
    startTransition(() => {
      setColumnCount((prev) => (prev === next ? prev : next));
    });
  }

  useEffect(() => {
    if (typeof override === "number") {
      return;
    }

    if (widthElementRef) {
      return;
    }

    function scheduleFromWindow() {
      if (typeof window === "undefined") {
        return;
      }

      if (rafIdRef.current !== null) {
        return;
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (typeof window === "undefined") {
          return;
        }
        commitColumnCount(window.innerWidth);
      });
    }

    commitColumnCount(window.innerWidth);
    window.addEventListener("resize", scheduleFromWindow);

    return () => {
      window.removeEventListener("resize", scheduleFromWindow);
      cancelScheduledRaf();
    };
  }, [override, widthElementRef, minColumns, minTrackWidthPx]);

  useLayoutEffect(() => {
    if (typeof override === "number") {
      return;
    }

    const el = widthElementRef?.current ?? null;
    if (!el) {
      if (widthElementRef && typeof window !== "undefined") {
        commitColumnCount(window.innerWidth);
      }
      return;
    }

    function scheduleFromLastObservedWidth() {
      if (rafIdRef.current !== null) {
        return;
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const w = resizeObserverWidthRef.current;
        let basis = w;
        if (basis <= 0 && typeof window !== "undefined") {
          basis = window.innerWidth;
        }
        commitColumnCount(basis);
      });
    }

    const ro = new ResizeObserver((entries) => {
      resizeObserverWidthRef.current = entries[0]?.contentRect.width ?? 0;
      scheduleFromLastObservedWidth();
    });

    ro.observe(el);
    resizeObserverWidthRef.current = el.getBoundingClientRect().width;
    commitColumnCount(resizeObserverWidthRef.current);

    return () => {
      ro.disconnect();
      cancelScheduledRaf();
    };
  }, [override, widthElementRef, minColumns, minTrackWidthPx]);

  return typeof override === "number" ? override : columnCount;
}
