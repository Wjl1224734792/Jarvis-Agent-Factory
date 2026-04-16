import { useEffect, useState } from "react";

/**
 * 与 Tailwind `xl` 断点一致（默认 1280px），用于在小于该宽度时不在 DOM 中渲染仅桌面展示的节点（如侧栏）。
 */
export function useMatchMedia(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);

    function onChange() {
      setMatches(mq.matches);
    }

    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, [query]);

  return matches;
}

/** Tailwind 默认 `min-width: 1280px` → `xl:` */
export const TAILWIND_XL_MEDIA = "(min-width: 1280px)";

/** Tailwind 默认 `min-width: 768px` → `md:`；与底部主导航（仅窄屏/手机）显示范围一致。 */
export const TAILWIND_MD_MEDIA = "(min-width: 768px)";
