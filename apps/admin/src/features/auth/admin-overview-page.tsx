import { useQuery } from "@tanstack/react-query";
import { Button, Flex, Table } from "antd";
import { APP_ROUTES } from "@feijia/shared";
import { Link } from "react-router-dom";
import { useAdminAuthStore } from "./auth-store";
import { apiClient } from "../../lib/api-client";
import { AdminMetric, AdminPage, AdminPanel } from "../../components/admin-ui";

export function AdminOverviewPage() {
  const user = useAdminAuthStore((state) => state.user);
  const error = useAdminAuthStore((state) => state.error);

  const postsQuery = useQuery({
    queryKey: ["admin-overview", "posts"],
    queryFn: () => apiClient.listAdminPosts()
  });
  const commentsQuery = useQuery({
    queryKey: ["admin-overview", "comments"],
    queryFn: () => apiClient.listAdminPostComments()
  });
  const reviewsQuery = useQuery({
    queryKey: ["admin-overview", "reviews"],
    queryFn: () => apiClient.listAdminReviews()
  });
  const modelsQuery = useQuery({
    queryKey: ["admin-overview", "models"],
    queryFn: () => apiClient.listModels()
  });
  const categoriesQuery = useQuery({
    queryKey: ["admin-overview", "categories"],
    queryFn: () => apiClient.listCategories()
  });
  const brandsQuery = useQuery({
    queryKey: ["admin-overview", "brands"],
    queryFn: () => apiClient.listBrands()
  });

  const loading =
    postsQuery.isLoading ||
    commentsQuery.isLoading ||
    reviewsQuery.isLoading ||
    modelsQuery.isLoading ||
    categoriesQuery.isLoading ||
    brandsQuery.isLoading;

  const metrics = {
    posts: postsQuery.data?.items.length ?? 0,
    comments: commentsQuery.data?.items.length ?? 0,
    reviews: reviewsQuery.data?.items.length ?? 0,
    models: modelsQuery.data?.items.length ?? 0,
    pendingPosts: postsQuery.data?.items.filter((item) => item.status === "pending").length ?? 0,
    hiddenComments:
      commentsQuery.data?.items.filter((item) => item.status === "hidden").length ?? 0,
    hiddenReviews: reviewsQuery.data?.items.filter((item) => item.status === "hidden").length ?? 0,
    categories: categoriesQuery.data?.length ?? 0,
    brands: brandsQuery.data?.length ?? 0
  };

  const queueRows = [
    { key: "posts", label: "待审核帖子", value: metrics.pendingPosts, action: APP_ROUTES.adminPosts },
    { key: "comments", label: "隐藏评论", value: metrics.hiddenComments, action: APP_ROUTES.adminPostComments },
    { key: "reviews", label: "隐藏点评", value: metrics.hiddenReviews, action: APP_ROUTES.adminReviews }
  ];

  const recentRows = [
    ...(postsQuery.data?.items.slice(0, 3).map((item) => ({
      key: `post-${item.id}`,
      type: "帖子",
      title: item.title,
      status: item.status,
      author: item.author.displayName
    })) ?? []),
    ...(commentsQuery.data?.items.slice(0, 2).map((item) => ({
      key: `comment-${item.id}`,
      type: "评论",
      title: item.postTitle,
      status: item.status,
      author: item.author.displayName
    })) ?? [])
  ];

  return (
    <AdminPage
      actions={
        <>
          <Button href={APP_ROUTES.adminModels}>
            管理机型
          </Button>
          <Button href={APP_ROUTES.adminPosts} type="primary">
            处理审核队列
          </Button>
        </>
      }
      description={`当前管理员：${user?.displayName ?? "管理员"}。后台现在统一管理内容审核、目录资产和官方榜单。`}
      title="后台概览"
    >
      {error ? (
        <div className="admin-login__error">{error}</div>
      ) : null}

      <div className="admin-metric-grid">
        <AdminMetric hint="已进入治理视图的内容池" label="帖子总量" value={metrics.posts} />
        <AdminMetric hint="含楼中回复的审核对象" label="评论总量" value={metrics.comments} />
        <AdminMetric hint="口碑展示与隐藏治理" label="点评总量" value={metrics.reviews} />
        <AdminMetric hint="当前公开的机型主数据" label="机型总量" value={metrics.models} />
      </div>

      <div className="admin-split">
        <AdminPanel description="优先从这里处理待审核和已隐藏对象。" title="治理队列">
          <Table
            bordered
            columns={[
              { dataIndex: "label", key: "label", title: "事项" },
              { dataIndex: "value", key: "value", title: "数量", width: 120 },
              {
                key: "action",
                render: (_, record: (typeof queueRows)[number]) => (
                  <Button href={record.action} type="link">
                    进入
                  </Button>
                ),
                title: "操作",
                width: 120
              }
            ]}
          dataSource={queueRows}
            loading={loading}
            pagination={false}
            rowKey={(record) => record.key}
            size="middle"
          />
        </AdminPanel>

        <AdminPanel description="快速检查最新进入后台视图的对象。" title="最近对象">
          <Table
            bordered
            columns={[
              { dataIndex: "type", key: "type", title: "类型", width: 96 },
              { dataIndex: "title", key: "title", title: "标题" },
              { dataIndex: "author", key: "author", title: "作者", width: 140 },
              { dataIndex: "status", key: "status", title: "状态", width: 120 }
            ]}
            dataSource={recentRows}
            loading={loading}
            pagination={false}
            rowKey={(record) => record.key}
            size="middle"
          />
        </AdminPanel>
      </div>

      <AdminPanel description="目录资产决定了前后台的发现和管理效率。" title="目录资产">
        <Flex gap={12} wrap>
          <AdminMetric hint="当前分类数量" label="分类" value={metrics.categories} />
          <AdminMetric hint="当前品牌数量" label="品牌" value={metrics.brands} />
          <AdminMetric hint="待审核帖子" label="审核队列" value={metrics.pendingPosts} />
        </Flex>
      </AdminPanel>
    </AdminPage>
  );
}
