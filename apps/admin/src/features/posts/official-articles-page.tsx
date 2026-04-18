import { Suspense, lazy } from "react";

const OfficialArticlesPageContent = lazy(() =>
  import("./official-articles-page-content").then((module) => ({
    default: module.OfficialArticlesPage
  }))
);

function OfficialArticlesPageLoading() {
  return (
    <main className="admin-route-error">
      <div className="admin-route-error__title">正在加载官方文章编辑器</div>
      <div className="admin-route-error__message">仅在进入该工作台后再请求富文本编辑器和表单依赖。</div>
    </main>
  );
}

export function OfficialArticlesPage() {
  return (
    <Suspense fallback={<OfficialArticlesPageLoading />}>
      <OfficialArticlesPageContent />
    </Suspense>
  );
}
