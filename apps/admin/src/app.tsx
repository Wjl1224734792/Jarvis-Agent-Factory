import { APP_ROUTES } from "@feijia/shared";
import {
  CloudUploadOutlined,
  CommentOutlined,
  FileSearchOutlined,
  FlagOutlined,
  GatewayOutlined,
  InboxOutlined,
  OrderedListOutlined,
  ReadOutlined,
  TagsOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import { Button, Flex } from "antd";
import { createBrowserRouter, Navigate, RouterProvider, useRouteError } from "react-router-dom";
import { AdminLoginPage } from "./features/auth/admin-login-page";
import { AdminOverviewPage } from "./features/auth/admin-overview-page";
import { AdminProtectedRoute } from "./features/auth/admin-protected-route";
import { AdminSectionHubPage } from "./features/auth/admin-section-hub-page";
import { AdminShell } from "./features/auth/admin-shell";
import { BrandApplicationsPage } from "./features/models/brand-applications-page";
import { BrandsPage } from "./features/models/brands-page";
import { CategoriesPage } from "./features/models/categories-page";
import { ModelsPage } from "./features/models/models-page";
import { ContentCategoriesPage } from "./features/posts/content-categories-page";
import { OfficialArticlesPage } from "./features/posts/official-articles-page";
import { PostCommentsPage } from "./features/posts/post-comments-page";
import { PostsPage } from "./features/posts/posts-page";
import { ReportsPage } from "./features/reports/reports-page";
import { RankingEditorPage } from "./features/rankings/ranking-editor-page";
import { RankingItemsPage } from "./features/rankings/ranking-items-page";
import { RankingsPage } from "./features/rankings/rankings-page";
import { ReviewsPage } from "./features/reviews/reviews-page";
import { AircraftSubmissionsPage } from "./features/submissions/aircraft-submissions-page";
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

const router = createBrowserRouter([
  {
    path: "/",
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
        element: <AdminOverviewPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.moderation.slice("/admin/".length),
        element: (
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
                title: "条目审核",
                description: "榜单条目独立列表，和榜单本身分开查看。",
                to: ADMIN_ROUTE_PATHS.moderationRankingItems,
                icon: <OrderedListOutlined />
              }
            ]}
            title="审核"
          />
        )
      },
      {
        path: ADMIN_ROUTE_PATHS.operations.slice("/admin/".length),
        element: (
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
        element: (
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
              }
            ]}
            title="管理"
          />
        )
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationArticles.slice("/admin/".length),
        element: <PostsPage contentType="article" />
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationMoments.slice("/admin/".length),
        element: <PostsPage contentType="moment" />
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationComments.slice("/admin/".length),
        element: <PostCommentsPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationReports.slice("/admin/".length),
        element: <ReportsPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationBrandApplications.slice("/admin/".length),
        element: <BrandApplicationsPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationAircraftSubmissions.slice("/admin/".length),
        element: <AircraftSubmissionsPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationRankings.slice("/admin/".length),
        element: <RankingsPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.moderationRankingItems.slice("/admin/".length),
        element: <RankingItemsPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.operationsArticles.slice("/admin/".length),
        element: <OfficialArticlesPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.operationsAircraft.slice("/admin/".length),
        element: <ModelsPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.operationsRankings.slice("/admin/".length),
        element: <RankingEditorPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.managementCategories.slice("/admin/".length),
        element: <CategoriesPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.managementBrands.slice("/admin/".length),
        element: <BrandsPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.managementModels.slice("/admin/".length),
        element: <ModelsPage />
      },
      {
        path: ADMIN_ROUTE_PATHS.managementContentCategories.slice("/admin/".length),
        element: <ContentCategoriesPage />
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
        element: <ReviewsPage />
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
        element: <OfficialArticlesPage />
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
        element: <RankingEditorPage />
      },
      {
        path: `${APP_ROUTES.adminRankings.slice("/admin/".length)}/:id`,
        element: <RankingEditorPage />
      }
    ]
  },
  {
    path: "*",
    element: <Navigate replace to={ADMIN_ROUTE_PATHS.overview} />
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
