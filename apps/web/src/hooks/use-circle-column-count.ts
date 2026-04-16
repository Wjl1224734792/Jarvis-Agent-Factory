import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { getCircleColumnCount } from "@/routes/circle-page-helpers";

export type UseCircleColumnCountOptions = {
  /** 传入时用其内容宽度推算列数（飞友圈等真实内容区），避免仅用视口宽度与侧栏/内边距不一致 */
  widthElementRef?: RefObject<HTMLElement | null>;
};

function getInitialCircleColumnCount() {
  if (typeof window === "undefined") {
    return 2;
  }

  return getCircleColumnCount(window.innerWidth);
}

/**
 * 与飞友圈列表一致的响应式列数。
 * - 传入 `override` 时固定使用该值且不监听尺寸。
 * - 传入 `widthElementRef` 时用 ResizeObserver 测量容器宽度；宽度为 0 时回退到 `window.innerWidth`。
 * - 否则用 `window.innerWidth` + resize。
 */
export function useCircleColumnCount(override?: number, options?: UseCircleColumnCountOptions) {
  const widthElementRef = options?.widthElementRef;
  const [columnCount, setColumnCount] = useState(() =>
    typeof override === "number" ? override : getInitialCircleColumnCount()
  );

  useEffect(() => {
    if (typeof override === "number") {
      return;
    }

    if (widthElementRef) {
      return;
    }

    function syncFromWindow() {
      if (typeof window === "undefined") {
        return;
      }

      setColumnCount(getCircleColumnCount(window.innerWidth));
    }

    syncFromWindow();
    window.addEventListener("resize", syncFromWindow);

    return () => {
      window.removeEventListener("resize", syncFromWindow);
    };
  }, [override, widthElementRef]);

  useLayoutEffect(() => {
    if (typeof override === "number") {
      return;
    }

    const el = widthElementRef?.current ?? null;
    if (!el) {
      if (widthElementRef && typeof window !== "undefined") {
        setColumnCount(getCircleColumnCount(window.innerWidth));
      }
      return;
    }

    function applyWidth(px: number) {
      let basis = px;
      if (basis <= 0 && typeof window !== "undefined") {
        basis = window.innerWidth;
      }
      setColumnCount(getCircleColumnCount(basis));
    }

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      applyWidth(w);
    });

    ro.observe(el);
    applyWidth(el.getBoundingClientRect().width);

    return () => {
      ro.disconnect();
    };
  }, [override, widthElementRef]);

  return typeof override === "number" ? override : columnCount;
}
