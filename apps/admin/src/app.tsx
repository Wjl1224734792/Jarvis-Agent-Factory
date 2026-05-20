import { APP_ROUTES } from "@feijia/shared";
import {
  CloudUploadOutlined,
  CommentOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  FlagOutlined,
  GatewayOutlined,
  InboxOutlined,
  LockOutlined,
  OrderedListOutlined,
  ReadOutlined,
  TagsOutlined,
  TrophyOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Button, Flex } from "antd";
import { Suspense, lazy, type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useLocation,
  useRouteError
} from "react-router-dom";
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

function PreserveSearchNavigate(props: {
  pathname: string;
  defaultSearch?: Record<string, string>;
}) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  if (props.defaultSearch) {
    for (const [key, value] of Object.entries(props.defaultSearch)) {
      if (!searchParams.has(key)) {
        searchParams.set(key, value);
      }
    }
  }

  const search = searchParams.toString();
  return (
    <Navigate
      replace
      to={{
        pathname: props.pathname,
        search: search.length > 0 ? `?${search}` : ""
      }}
    />
  );
}

function withAdminRouteFallback(children: ReactNode) {
  return <Suspense fallback={<AdminRouteLoading />}>{children}</Suspense>;
}

function stripAdminPrefix(path: string) {
  return path.slice("/admin/".length);
}

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
const AdminMessagesPage = lazy(() =>
  import("./features/messages/admin-messages-page").then((module) => ({
    default: module.AdminMessagesPage
  }))
);
const AdminModerationTodosPage = lazy(() =>
  import("./features/messages/admin-moderation-todos-page").then((module) => ({
    default: module.AdminModerationTodosPage
  }))
);
const AdminPasswordPage = lazy(() =>
  import("./features/auth/admin-password-page").then((module) => ({
    default: module.AdminPasswordPage
  }))
);
const AdminUsersPage = lazy(() =>
  import("./features/users/admin-users-page").then((module) => ({
    default: module.AdminUsersPage
  }))
);
const AdminSearchPage = lazy(() =>
  import("./features/search/admin-search-page").then((module) => ({
    default: module.AdminSearchPage
  }))
);
const AdminLogsPage = lazy(() =>
  import("./features/system/admin-logs-page").then((module) => ({
    default: module.AdminLogsPage
  }))
);
const AdminFileAuditsPage = lazy(() =>
  import("./features/system/admin-file-audits-page").then((module) => ({
    default: module.AdminFileAuditsPage
  }))
);
const BrandApplicationsPage = lazy(() =>
  import("./features/models/brand-applications-page").then((module) => ({
    default: module.BrandApplicationsPage
  }))
);
const BrandCreatorPage = lazy(() =>
  import("./features/models/brand-creator-page").then((module) => ({
    default: module.BrandCreatorPage
  }))
);
const BrandsPage = lazy(() =>
  import("./features/models/brands-page").then((module) => ({
    default: module.BrandsPage
  }))
);
const AircraftCreatorPage = lazy(() =>
  import("./features/models/aircraft-creator-page").then((module) => ({
    default: module.AircraftCreatorPage
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
const CirclesAdminPage = lazy(() =>
  import("./features/circles/circles-page").then((module) => ({
    default: module.CirclesPage
  }))
);
const ContentCategoriesPage = lazy(() =>
  import("./features/posts/content-categories-page").then((module) => ({
    default: module.ContentCategoriesPage
  }))
);
const PowerTypesPage = lazy(() =>
  import("./features/models/power-types-page").then((module) => ({
    default: module.PowerTypesPage
  }))
);
const OfficialArticlesPage = lazy(() =>
  import("./features/posts/official-articles-page").then((module) => ({
    default: module.OfficialArticlesPage
  }))
);
const OfficialArticlesLibraryPage = lazy(() =>
  import("./features/posts/official-articles-library-page").then((module) => ({
    default: module.OfficialArticlesLibraryPage
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
const AiSettingsPage = lazy(() =>
  import("./features/ai/ai-settings-page").then((module) => ({
    default: module.AiSettingsPage
  }))
);
const AdminRolesPage = lazy(() =>
  import("./features/roles/admin-roles-page").then((module) => ({
    default: module.AdminRolesPage
  }))
);

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
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.overview),
        element: withAdminRouteFallback(<AdminOverviewPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.messages),
        element: withAdminRouteFallback(<AdminMessagesPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.messageTodos),
        element: withAdminRouteFallback(<AdminModerationTodosPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.logs),
        element: withAdminRouteFallback(<AdminLogsPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.search),
        element: withAdminRouteFallback(<AdminSearchPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.moderation),
        element: withAdminRouteFallback(
          <AdminSectionHubPage
            description="把文章、动态、评论、品牌申请、机型投稿、榜单和评分对象拆成独立审核入口。"
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
              },
              {
                title: "文件审核",
                description: "图片/视频文件审核记录与人工通过、驳回入口。",
                to: ADMIN_ROUTE_PATHS.moderationFiles,
                icon: <CloudUploadOutlined />
              }
            ]}
            title="审核"
          />
        )
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.operations),
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
                title: "创建品牌",
                description: "品牌新建与 Logo 上传工作台。",
                to: ADMIN_ROUTE_PATHS.operationsBrands,
                icon: <TagsOutlined />
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
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.management),
        element: withAdminRouteFallback(
          <AdminSectionHubPage
            description="品牌库、机型库和分类配置放到同一层，便于资料维护。"
            items={[
              {
                title: "日志监控",
                description: "查看日志分类、文件清单和最近日志行。",
                to: ADMIN_ROUTE_PATHS.logs,
                icon: <DatabaseOutlined />
              },
              {
                title: "官方文章库",
                description: "官方文章历史维护、编辑和删除入口。",
                to: ADMIN_ROUTE_PATHS.managementOfficialArticles,
                icon: <ReadOutlined />
              },
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
                title: "圈子管理",
                description: "管理所有飞友圈，包括编辑、启用和禁用圈子。",
                to: ADMIN_ROUTE_PATHS.managementCircles,
                icon: <InboxOutlined />
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
                title: "用户管理",
                description: "搜索用户、查看详情，并处理封禁或解封操作。",
                to: ADMIN_ROUTE_PATHS.managementUsers,
                icon: <UserOutlined />
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
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.moderationArticles),
        element: withAdminRouteFallback(<PostsPage contentType="article" />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.moderationMoments),
        element: withAdminRouteFallback(<PostsPage contentType="moment" />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.moderationComments),
        element: withAdminRouteFallback(<PostCommentsPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.moderationReports),
        element: withAdminRouteFallback(<ReportsPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.moderationBrandApplications),
        element: withAdminRouteFallback(<BrandApplicationsPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.moderationAircraftSubmissions),
        element: withAdminRouteFallback(<AircraftSubmissionsPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.moderationRankings),
        element: withAdminRouteFallback(<RankingsPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.moderationRatingTargets),
        element: withAdminRouteFallback(<RatingTargetsPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.moderationFiles),
        element: withAdminRouteFallback(<AdminFileAuditsPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.operationsArticles),
        element: withAdminRouteFallback(<OfficialArticlesPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.operationsAircraft),
        element: withAdminRouteFallback(<AircraftCreatorPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.operationsBrands),
        element: withAdminRouteFallback(<BrandCreatorPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.operationsRankings),
        element: withAdminRouteFallback(<RankingEditorPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.managementCategories),
        element: withAdminRouteFallback(<CategoriesPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.managementBrands),
        element: withAdminRouteFallback(<BrandsPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.managementModels),
        element: withAdminRouteFallback(<ModelsPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.managementCircles),
        element: withAdminRouteFallback(<CirclesAdminPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.managementContentCategories),
        element: withAdminRouteFallback(<ContentCategoriesPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.managementPowerTypes),
        element: withAdminRouteFallback(<PowerTypesPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.managementOfficialArticles),
        element: withAdminRouteFallback(<OfficialArticlesLibraryPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.managementUsers),
        element: withAdminRouteFallback(<AdminUsersPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.managementSecurity),
        element: withAdminRouteFallback(<AdminPasswordPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.managementRoles),
        element: withAdminRouteFallback(<AdminRolesPage />)
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.aiSettings),
        element: withAdminRouteFallback(<AiSettingsPage />)
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminCategories),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.managementCategories} />
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminBrands),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.managementBrands} />
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminBrandApplications),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.moderationBrandApplications} />
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminModels),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.managementModels} />
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminReviews),
        element: withAdminRouteFallback(<ReviewsPage />)
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminPosts),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.moderationArticles} />
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminContentCategories),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.managementContentCategories} />
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminPostComments),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.moderationComments} defaultSearch={{ domain: "post" }} />
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminReviewComments),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.moderationComments} defaultSearch={{ domain: "review" }} />
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminModelComments),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.moderationComments} defaultSearch={{ domain: "model" }} />
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminRankingComments),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.moderationComments} defaultSearch={{ domain: "ranking" }} />
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminRatingTargetComments),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.moderationComments} defaultSearch={{ domain: "rating-target" }} />
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.officialArticles),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.managementOfficialArticles} />
      },
      {
        path: stripAdminPrefix(ADMIN_ROUTE_PATHS.aircraftSubmissions),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.moderationAircraftSubmissions} />
      },
      {
        path: stripAdminPrefix(APP_ROUTES.adminRankings),
        element: <PreserveSearchNavigate pathname={ADMIN_ROUTE_PATHS.moderationRankings} />
      },
      {
        path: `${stripAdminPrefix(APP_ROUTES.adminRankings)}/new`,
        element: withAdminRouteFallback(<RankingEditorPage />)
      },
      {
        path: `${stripAdminPrefix(APP_ROUTES.adminRankings)}/:id`,
        element: withAdminRouteFallback(<RankingEditorPage />)
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
