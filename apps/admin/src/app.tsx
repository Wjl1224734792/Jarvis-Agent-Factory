import { APP_ROUTES } from "@feijia/shared";
import {
  CloudUploadOutlined,
  CommentOutlined,
  FileSearchOutlined,
  FlagOutlined,
  GatewayOutlined,
  InboxOutlined,
  LockOutlined,
  OrderedListOutlined,
  ReadOutlined,
  TagsOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import { Button, Flex } from "antd";
import { Suspense, lazy, type ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider, useRouteError } from "react-router-dom";
import { AdminLoginPage } from "./features/auth/admin-login-page";
import { AdminProtectedRoute } from "./features/auth/admin-protected-route";
import { AdminShell } from "./features/auth/admin-shell";
import { ADMIN_ROUTE_PATHS } from "./lib/admin-routes";

function AdminRouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "后台页面暂时无法打开。";

  return (
    <main className="admin-route-error">
      <Flex align="center" gap={16} justify="center" vertical>
        <div className="admin-route-error__title">后台页面暂时无法打开</div>
        <div className="admin-route-error__message">{message}</div>
        <Button href={APP_ROUTES.adminHome} type="primary">
          返回后台首页
        </Button>
      </Flex>
    </main>
  );
}

function AdminRouteLoading() {
  return (
    <main className="admin-route-error">
      <Flex align="center" gap={12} justify="center" vertical>
        <Button loading type="primary">
          正在加载后台页面
        </Button>
        <div className="admin-route-error__message">请稍候，正在准备当前管理模块。</div>
      </Flex>
    </main>
  );
}

function withAdminRouteFallback(children: ReactNode) {
  return <Suspense fallback={<AdminRouteLoading />}>{children}</Suspense>;
}

// 后台页面体积较大，按模块懒加载，首次进入时只加载当前管理域所需代码。
const AdminOverviewPage = lazy(() =>
  import("./features/auth/admin-overview-page").then((module) => ({
    default: module.AdminOverviewPage
  }))
);
const AdminSectionHubPage = lazy(() =>
  import("./features/auth/admin-section-hub-page").then((module) => ({
    default: module.AdminSectionHubPage
  }))
);
const AdminPasswordPage = lazy(() =>
  import("./features/auth/admin-password-page").then((module) => ({
    default: module.AdminPasswordPage
  }))
);
const AdminSearchPage = lazy(() =>
  import("./features/search/admin-search-page").then((module) => ({
    default: module.AdminSearchPage
  }))
);
const BrandApplicationsPage = lazy(() =>
  import("./features/models/brand-applications-page").then((module) => ({
    default: module.BrandApplicationsPage
  }))
);
const BrandsPage = lazy(() =>
  import("./features/models/brands-page").then((module) => ({
    default: module.BrandsPage
  }))
);
const CategoriesPage = lazy(() =>
  import("./features/models/categories-page").then((module) => ({
    default: module.CategoriesPage
  }))
);
const ModelsPage = lazy(() =>
  import("./features/models/models-page").then((module) => ({
    default: module.ModelsPage
  }))
);
const ContentCategoriesPage = lazy(() =>
  import("./features/posts/content-categories-page").then((module) => ({
    default: module.ContentCategoriesPage
  }))
);
const OfficialArticlesPage = lazy(() =>
  import("./features/posts/official-articles-page").then((module) => ({
    default: module.OfficialArticlesPage
  }))
);
const PostCommentsPage = lazy(() =>
  import("./features/posts/post-comments-page").then((module) => ({
    default: module.PostCommentsPage
  }))
);
const PostsPage = lazy(() =>
  import("./features/posts/posts-page").then((module) => ({
    default: module.PostsPage
  }))
);
const ReportsPage = lazy(() =>
  import("./features/reports/reports-page").then((module) => ({
    default: module.ReportsPage
  }))
);
const RankingEditorPage = lazy(() =>
  import("./features/rankings/ranking-editor-page").then((module) => ({
    default: module.RankingEditorPage
  }))
);
const RatingTargetsPage = lazy(() =>
  import("./features/rankings/rating-targets-page").then((module) => ({
    default: module.RatingTargetsPage
  }))
);
const RankingsPage = lazy(() =>
  import("./features/rankings/rankings-page").then((module) => ({
    default: module.RankingsPage
  }))
);
const ReviewsPage = lazy(() =>
  import("./features/reviews/reviews-page").then((module) => ({
    default: module.ReviewsPage
  }))
);
const AircraftSubmissionsPage = lazy(() =>
  import("./features/submissions/aircraft-submissions-page").then((module) => ({
    default: module.AircraftSubmissionsPage
  }))
);

// 后台路由按“审核 / 运营 / 管理”三大分区组织，方便和侧边导航、权限心智保持一致。
const router = createBrowserRouter([
  {
    path: "/",
    // 根路径始终归一到后台首页，减少多入口带来的状态分叉。
    element: <Navigate replace to={APP_ROUTES.adminHome} />
  },
  {
    path: APP_ROUTES.adminLogin,
    element: <AdminLoginPage />,
    errorElement: <AdminRouteError />
  },
  {
    path: APP_ROUTES.adminHome,
    element: (
      <AdminProtectedRoute>
        <AdminShell />
      </AdminProtectedRoute>
    ),
    errorElement: <AdminRouteError />,
    children: [
      {
        index: true,
        element: <Navigate replace to={ADMIN_ROUTE_PATHS.overview} />
      },
      {
        path: ADMIN_ROUTE_PATHS.overview.slice("/admin/".length),
        element: withAdminRouteFallback(<AdminOverviewPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.search.slice("/admin/".length),
        element: withAdminRouteFallback(<AdminSearchPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.moderation.slice("/admin/".length),
        // Hub 页面只负责聚合入口，具体审核逻辑仍拆在各自独立模块里。
        element: withAdminRouteFallback(
          <AdminSectionHubPage
            description="把文章、动态、评论、品牌申请、机型投稿、榜单和榜单条目拆成独立审核入口。"
            items={[
              {
                title: "文章审核",
                description: "单独查看文章发布队列和文章审核策略。",
                to: ADMIN_ROUTE_PATHS.moderationArticles,
                icon: <FlagOutlined />
              },
              {
                title: "飞友圈动态",
                description: "动态审核和文章彻底拆开，减少内容混杂。",
                to: ADMIN_ROUTE_PATHS.moderationMoments,
                icon: <ReadOutlined />
              },
              {
                title: "评论审核",
                description: "评论与回复统一治理，单独处理违规内容。",
                to: ADMIN_ROUTE_PATHS.moderationComments,
                icon: <CommentOutlined />
              },
              {
                title: "举报内容",
                description: "集中查看被举报的文章、评测和榜单条目。",
                to: ADMIN_ROUTE_PATHS.moderationReports,
                icon: <FileSearchOutlined />
              },
              {
                title: "品牌申请",
                description: "品牌申请独立排队，和机型投稿分离。",
                to: ADMIN_ROUTE_PATHS.moderationBrandApplications,
                icon: <InboxOutlined />
              },
              {
                title: "机型投稿",
                description: "飞行器资料和机型投稿的审核入口。",
                to: ADMIN_ROUTE_PATHS.moderationAircraftSubmissions,
                icon: <CloudUploadOutlined />
              },
              {
                title: "榜单审核",
                description: "社区榜单的创建、发布和状态处理。",
                to: ADMIN_ROUTE_PATHS.moderationRankings,
                icon: <OrderedListOutlined />
              },
              {
                title: "评分对象审核",
                description: "评分对象独立列表，和榜单本身分开查看。",
                to: ADMIN_ROUTE_PATHS.moderationRatingTargets,
                icon: <OrderedListOutlined />
              }
            ]}
            title="审核"
          />
        )
      },
      {
        path: ADMIN_ROUTE_PATHS.operations.slice("/admin/".length),
        element: withAdminRouteFallback(
          <AdminSectionHubPage
            description="把创建和发布动作集中在运营区，避免和审核队列混在一起。"
            items={[
              {
                title: "创建文章",
                description: "官方文章的创建、编辑与发布工作台。",
                to: ADMIN_ROUTE_PATHS.operationsArticles,
                icon: <ReadOutlined />
              },
              {
                title: "创建飞行器",
                description: "飞行器和机型建档入口，和品牌申请分开。",
                to: ADMIN_ROUTE_PATHS.operationsAircraft,
                icon: <GatewayOutlined />
              },
              {
                title: "创建榜单",
                description: "榜单创建、条目编排和官方榜单运营。",
                to: ADMIN_ROUTE_PATHS.operationsRankings,
                icon: <TrophyOutlined />
              }
            ]}
            title="运营"
          />
        )
      },
      {
        path: ADMIN_ROUTE_PATHS.management.slice("/admin/".length),
        element: withAdminRouteFallback(
          <AdminSectionHubPage
            description="品牌库、机型库和分类配置放到同一层，便于资料维护。"
            items={[
              {
                title: "品牌库",
                description: "品牌资料维护，不再显示和一级分类强绑定。",
                to: ADMIN_ROUTE_PATHS.managementBrands,
                icon: <TagsOutlined />
              },
              {
                title: "机型库",
                description: "机型资料维护，并使用已有品牌搜索选择。",
                to: ADMIN_ROUTE_PATHS.managementModels,
                icon: <GatewayOutlined />
              },
              {
                title: "机型分类",
                description: "机型一级分类配置与展示顺序维护。",
                to: ADMIN_ROUTE_PATHS.managementCategories,
                icon: <TagsOutlined />
              },
              {
                title: "内容分类",
                description: "文章与资讯栏目管理。",
                to: ADMIN_ROUTE_PATHS.managementContentCategories,
                icon: <TagsOutlined />
              },
              {
                title: "安全设置",
                description: "管理员密码修改与后台账号安全。",
                to: ADMIN_ROUTE_PATHS.managementSecurity,
                icon: <LockOutlined />
              }
            ]}
            title="管理"
          />
        )
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationArticles.slice("/admin/".length),
        element: withAdminRouteFallback(<PostsPage contentType="article" />)
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationMoments.slice("/admin/".length),
        element: withAdminRouteFallback(<PostsPage contentType="moment" />)
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationComments.slice("/admin/".length),
        element: withAdminRouteFallback(<PostCommentsPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationReports.slice("/admin/".length),
        element: withAdminRouteFallback(<ReportsPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationBrandApplications.slice("/admin/".length),
        element: withAdminRouteFallback(<BrandApplicationsPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationAircraftSubmissions.slice("/admin/".length),
        element: withAdminRouteFallback(<AircraftSubmissionsPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationRankings.slice("/admin/".length),
        element: withAdminRouteFallback(<RankingsPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationRatingTargets.slice("/admin/".length),
        element: withAdminRouteFallback(<RatingTargetsPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.operationsArticles.slice("/admin/".length),
        element: withAdminRouteFallback(<OfficialArticlesPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.operationsAircraft.slice("/admin/".length),
        element: withAdminRouteFallback(<ModelsPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.operationsRankings.slice("/admin/".length),
        element: withAdminRouteFallback(<RankingEditorPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.managementCategories.slice("/admin/".length),
        element: withAdminRouteFallback(<CategoriesPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.managementBrands.slice("/admin/".length),
        element: withAdminRouteFallback(<BrandsPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.managementModels.slice("/admin/".length),
        element: withAdminRouteFallback(<ModelsPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.managementContentCategories.slice("/admin/".length),
        element: withAdminRouteFallback(<ContentCategoriesPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.managementSecurity.slice("/admin/".length),
        element: withAdminRouteFallback(<AdminPasswordPage />)
      },

      {
        path: APP_ROUTES.adminCategories.slice("/admin/".length),
        element: <Navigate replace to={ADMIN_ROUTE_PATHS.managementCategories} />
      },
      {
        path: APP_ROUTES.adminBrands.slice("/admin/".length),
        element: <Navigate replace to={ADMIN_ROUTE_PATHS.managementBrands} />
      },
      {
        path: APP_ROUTES.adminModels.slice("/admin/".length),
        element: <Navigate replace to={ADMIN_ROUTE_PATHS.managementModels} />
      },
      {
        path: APP_ROUTES.adminReviews.slice("/admin/".length),
        element: withAdminRouteFallback(<ReviewsPage />)
      },
      {
        path: APP_ROUTES.adminPosts.slice("/admin/".length),
        element: <Navigate replace to={ADMIN_ROUTE_PATHS.moderationArticles} />
      },
      {
        path: APP_ROUTES.adminContentCategories.slice("/admin/".length),
        element: <Navigate replace to={ADMIN_ROUTE_PATHS.managementContentCategories} />
      },
      {
        path: APP_ROUTES.adminPostComments.slice("/admin/".length),
        element: <Navigate replace to={ADMIN_ROUTE_PATHS.moderationComments} />
      },
      {
        path: ADMIN_ROUTE_PATHS.officialArticles.slice("/admin/".length),
        element: withAdminRouteFallback(<OfficialArticlesPage />)
      },
      {
        path: ADMIN_ROUTE_PATHS.aircraftSubmissions.slice("/admin/".length),
        element: <Navigate replace to={ADMIN_ROUTE_PATHS.moderationAircraftSubmissions} />
      },
      {
        path: APP_ROUTES.adminRankings.slice("/admin/".length),
        element: <Navigate replace to={ADMIN_ROUTE_PATHS.moderationRankings} />
      },
      {
        path: `${APP_ROUTES.adminRankings.slice("/admin/".length)}/new`,
        element: withAdminRouteFallback(<RankingEditorPage />)
      },
      {
        path: `${APP_ROUTES.adminRankings.slice("/admin/".length)}/:id`,
        element: withAdminRouteFallback(<RankingEditorPage />)
      }
    ]
  },
  {
    path: "*",
    // 任意未知后台路径都收敛到总览页，避免用户停留在无权限或无内容路由。
    element: <Navigate replace to={ADMIN_ROUTE_PATHS.overview} />
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
