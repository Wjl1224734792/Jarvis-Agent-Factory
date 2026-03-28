import { useQuery } from "@tanstack/react-query";
import { Button, Table } from "antd";
import { APP_ROUTES } from "@feijia/shared";
import {
  ArrowRightOutlined,
  FireOutlined,
  FileTextOutlined,
  RocketOutlined
} from "@ant-design/icons";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminMetric, AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import { buildAdminOverviewData } from "./admin-overview-helpers";
import { useAdminAuthStore } from "./auth-store";

export function AdminOverviewPage() {
  const user = useAdminAuthStore((state) => state.user);
  const error = useAdminAuthStore((state) => state.error);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
  const officialArticlesQuery = useQuery({
    queryKey: ["admin-overview", "official-articles"],
    queryFn: () => apiClient.listOfficialArticles()
  });
  const submissionsQuery = useQuery({
    queryKey: ["admin-overview", "aircraft-submissions"],
    queryFn: () => apiClient.listAdminAircraftSubmissions()
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-overview", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });

  const loading =
    postsQuery.isLoading ||
    commentsQuery.isLoading ||
    reviewsQuery.isLoading ||
    modelsQuery.isLoading ||
    categoriesQuery.isLoading ||
    brandsQuery.isLoading ||
    officialArticlesQuery.isLoading ||
    submissionsQuery.isLoading ||
    siteSettingsQuery.isLoading;

  const overview = buildAdminOverviewData({
    posts: postsQuery.data?.items ?? [],
    comments: commentsQuery.data?.items ?? [],
    reviews: reviewsQuery.data?.items ?? [],
    models: modelsQuery.data?.items ?? [],
    categories: categoriesQuery.data ?? [],
    brands: brandsQuery.data ?? [],
    officialArticles: officialArticlesQuery.data?.items ?? [],
    submissions: submissionsQuery.data?.items ?? [],
    siteSettings: siteSettingsQuery.data?.item ?? null
  });

  const maxTrendValue = Math.max(
    1,
    ...overview.trendRows.flatMap((item) => [item.content, item.submissions])
  );

  async function updateModeration(postModerationEnabled: boolean) {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      await apiClient.updateSiteSettings({ postModerationEnabled });
      await Promise.all([siteSettingsQuery.refetch(), postsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <AdminPage
      actions={
        <>
          <Button href={ADMIN_ROUTE_PATHS.officialArticles} type="primary">
            发布官方文章
          </Button>
          <Button href={ADMIN_ROUTE_PATHS.aircraftSubmissions}>审核投稿</Button>
        </>
      }
      description={`当前管理员：${user?.displayName ?? "管理员"}。先看待办，再决定今天优先处理发布、审核还是目录治理。`}
      title="运营概览"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <section className="admin-overview-hero">
        <div className="admin-overview-hero__copy">
          <div className="admin-overview-hero__eyebrow">今日运营面板</div>
          <div className="admin-overview-hero__title">把审核、发布和投稿处理压缩到一个首页。</div>
          <div className="admin-overview-hero__description">
            帖子审核、官方文章、飞行器投稿、榜单维护都在这里直达，不需要再先猜入口在哪。
          </div>
        </div>
        <div className="admin-overview-hero__actions">
          {overview.quickActions.map((item) => (
            <Link className="admin-action-card" key={item.key} to={item.href}>
              <div className="admin-action-card__title">{item.title}</div>
              <div className="admin-action-card__description">{item.description}</div>
              <div className="admin-action-card__meta">
                进入
                <ArrowRightOutlined />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="admin-metric-grid">
        {overview.metrics.map((item) => (
          <AdminMetric hint={item.hint} key={item.key} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="admin-overview-grid">
        <AdminPanel
          description="近 7 天观察内容入池和飞行器投稿量，方便判断当前运营负载。"
          title="内容与投稿趋势"
        >
          <div className="admin-trend-chart">
            {overview.trendRows.map((item) => (
              <div className="admin-trend-chart__column" key={item.label}>
                <div className="admin-trend-chart__bars">
                  <div
                    className="admin-trend-chart__bar admin-trend-chart__bar--content"
                    style={{ height: `${(item.content / maxTrendValue) * 100}%` }}
                    title={`内容 ${item.content}`}
                  />
                  <div
                    className="admin-trend-chart__bar admin-trend-chart__bar--submissions"
                    style={{ height: `${(item.submissions / maxTrendValue) * 100}%` }}
                    title={`投稿 ${item.submissions}`}
                  />
                </div>
                <div className="admin-trend-chart__label">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="admin-trend-legend">
            <span>
              <span className="admin-trend-legend__dot admin-trend-legend__dot--content" />
              内容入池
            </span>
            <span>
              <span className="admin-trend-legend__dot admin-trend-legend__dot--submissions" />
              飞行器投稿
            </span>
          </div>
        </AdminPanel>

        <AdminPanel
          description="前期没精力逐条盯审核时，可以先关闭帖子审核；机型投稿仍保留人工审核。"
          title="帖子审核开关"
        >
          <div className="admin-moderation-card">
            <div className="admin-moderation-card__status">
              <span className={`admin-pill ${overview.moderationEnabled ? "is-on" : "is-off"}`}>
                {overview.moderationEnabled ? "审核中" : "直发中"}
              </span>
              <div className="admin-moderation-card__description">
                {overview.moderationEnabled
                  ? "普通用户文章/动态会先进审核队列。"
                  : "普通用户文章/动态会直接公开。"}
              </div>
            </div>
            <div className="admin-moderation-card__actions">
              <Button
                disabled={isSavingSettings}
                onClick={() => {
                  void updateModeration(true);
                }}
                type={overview.moderationEnabled ? "primary" : "default"}
              >
                开启审核
              </Button>
              <Button
                disabled={isSavingSettings}
                onClick={() => {
                  void updateModeration(false);
                }}
                type={!overview.moderationEnabled ? "primary" : "default"}
              >
                关闭审核
              </Button>
            </div>
          </div>
        </AdminPanel>
      </div>

      <div className="admin-overview-grid">
        <AdminPanel description="先处理最影响前台体验的队列。" title="今日待办">
          <Table
            bordered
            columns={[
              { dataIndex: "label", key: "label", title: "事项" },
              { dataIndex: "value", key: "value", title: "数量", width: 120 },
              {
                key: "action",
                render: (_, record: (typeof overview.queueRows)[number]) => (
                  <Button href={record.action} type="link">
                    前往处理
                  </Button>
                ),
                title: "操作",
                width: 120
              }
            ]}
            dataSource={overview.queueRows}
            loading={loading}
            pagination={false}
            rowKey={(record) => record.key}
            size="middle"
          />
        </AdminPanel>

        <AdminPanel description="把高频动作放到固定入口，减少跳转成本。" title="快捷动作">
          <div className="admin-quick-grid">
            <Link className="admin-quick-grid__item" to={ADMIN_ROUTE_PATHS.officialArticles}>
              <div className="admin-quick-grid__icon">
                <FireOutlined />
              </div>
              <div>
                <div className="admin-quick-grid__title">发布官方文章</div>
                <div className="admin-quick-grid__description">处理首页要展示的官方内容。</div>
              </div>
            </Link>
            <Link className="admin-quick-grid__item" to={APP_ROUTES.adminPosts}>
              <div className="admin-quick-grid__icon">
                <FileTextOutlined />
              </div>
              <div>
                <div className="admin-quick-grid__title">处理帖子审核</div>
                <div className="admin-quick-grid__description">看待审核和隐藏对象。</div>
              </div>
            </Link>
            <Link className="admin-quick-grid__item" to={ADMIN_ROUTE_PATHS.aircraftSubmissions}>
              <div className="admin-quick-grid__icon">
                <RocketOutlined />
              </div>
              <div>
                <div className="admin-quick-grid__title">审核飞行器投稿</div>
                <div className="admin-quick-grid__description">前期仍保留人工审核。</div>
              </div>
            </Link>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel description="最近进入运营视图的对象，方便快速确认刚处理过什么。" title="最近对象">
        <Table
          bordered
          columns={[
            { dataIndex: "type", key: "type", title: "类型", width: 110 },
            { dataIndex: "title", key: "title", title: "标题" },
            { dataIndex: "owner", key: "owner", title: "归属", width: 140 },
            { dataIndex: "status", key: "status", title: "状态", width: 120 }
          ]}
          dataSource={overview.recentRows}
          loading={loading}
          pagination={false}
          rowKey={(record) => record.key}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
