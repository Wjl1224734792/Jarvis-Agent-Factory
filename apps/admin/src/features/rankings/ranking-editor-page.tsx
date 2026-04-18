import { Suspense, lazy } from "react";

const RankingEditorPageContent = lazy(() =>
  import("./ranking-editor-page-content").then((module) => ({
    default: module.RankingEditorPage
  }))
);

function RankingEditorPageLoading() {
  return (
    <main className="admin-route-error">
      <div className="admin-route-error__title">正在加载榜单编辑器</div>
      <div className="admin-route-error__message">编辑器主体与图片表单能力会在进入页面后按需拉取。</div>
    </main>
  );
}

export function RankingEditorPage() {
  return (
    <Suspense fallback={<RankingEditorPageLoading />}>
      <RankingEditorPageContent />
    </Suspense>
  );
}
