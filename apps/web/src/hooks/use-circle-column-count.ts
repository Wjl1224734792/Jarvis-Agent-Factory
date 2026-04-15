import { useEffect, useState } from "react";
import { getCircleColumnCount } from "@/routes/circle-page-helpers";

function getInitialCircleColumnCount() {
  if (typeof window === "undefined") {
    return 2;
  }

  return getCircleColumnCount(window.innerWidth);
}

/** 与飞友圈列表一致的响应式列数；传入 `override` 时固定使用该值且不监听 resize（用于子组件与父级同步）。 */
export function useCircleColumnCount(override?: number) {
  const [columnCount, setColumnCount] = useState(() =>
    typeof override === "number" ? override : getInitialCircleColumnCount()
  );

  useEffect(() => {
    if (typeof override === "number") {
      return;
    }

    function syncColumnCount() {
      setColumnCount(getCircleColumnCount(window.innerWidth));
    }

    syncColumnCount();
    window.addEventListener("resize", syncColumnCount);

    return () => {
      window.removeEventListener("resize", syncColumnCount);
    };
  }, [override]);

  return typeof override === "number" ? override : columnCount;
}
