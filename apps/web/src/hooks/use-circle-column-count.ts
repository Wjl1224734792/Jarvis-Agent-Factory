import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject
} from "react";
import {
  CIRCLE_FEED_MAX_COLUMNS,
  CIRCLE_FEED_MIN_COLUMNS,
  getCircleColumnCount
} from "@/routes/circle-page-helpers";

export type UseCircleColumnCountOptions = {
  /** 传入时用其内容宽度推算列数（飞友圈等真实内容区），避免仅用视口宽度与侧栏/内边距不一致 */
  widthElementRef?: RefObject<HTMLElement | null>;
  /** 最小列数，默认与飞友圈一致为 2；榜单页可传 1 允许单列 */
  minColumns?: number;
};

function getInitialCircleColumnCount(minColumns: number) {
  const fallback = Math.min(Math.max(1, minColumns), CIRCLE_FEED_MAX_COLUMNS);
  if (typeof window === "undefined") {
    return fallback;
  }

  return getCircleColumnCount(window.innerWidth, minColumns);
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
  const minColumnsRef = useRef(minColumns);
  minColumnsRef.current = minColumns;

  const [columnCount, setColumnCount] = useState(() =>
    typeof override === "number" ? override : getInitialCircleColumnCount(minColumns)
  );

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
    const next = getCircleColumnCount(basis, minColumnsRef.current);
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
  }, [override, widthElementRef, minColumns]);

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
  }, [override, widthElementRef, minColumns]);

  return typeof override === "number" ? override : columnCount;
}
