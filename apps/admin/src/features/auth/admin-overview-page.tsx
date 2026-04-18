import { useQuery } from "@tanstack/react-query";
import {
  BarChartOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  FileSearchOutlined,
  FlagOutlined,
  ReadOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import { Button, Empty, Segmented, Space } from "antd";
import { Suspense, lazy, startTransition, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";
import {
  formatAdminSessionIdentity,
  formatAdminSessionScope,
  formatAdminSessionStatus,
  formatAdminSessionTime,
  resolveAdminOverviewAuthError,
  resolveRecentSessionsPanelMessage
} from "./admin-session-helpers";
import { useAdminAuthStore } from "./auth-store";

const RegistrationTrendChart = lazy(() =>
  import("./admin-overview-charts").then((module) => ({
    default: module.RegistrationTrendChart
  }))
);
const ContentMixChart = lazy(() =>
  import("./admin-overview-charts").then((module) => ({
    default: module.ContentMixChart
  }))
);
const ActivityTrendChart = lazy(() =>
  import("./admin-overview-charts").then((module) => ({
    default: module.ActivityTrendChart
  }))
);
const ModerationFunnelChart = lazy(() =>
  import("./admin-overview-charts").then((module) => ({
    default: module.ModerationFunnelChart
  }))
);
const ModerationStatusChart = lazy(() =>
  import("./admin-overview-charts").then((module) => ({
    default: module.ModerationStatusChart
  }))
);

function formatPeriodLabel(periodStart: string, mode: "day" | "month" | "year") {
  const date = new Date(periodStart);
  if (mode === "day") {
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  }
  if (mode === "month") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return `${date.getUTCFullYear()}`;
}

function ChartLoadingFallback(props: { label: string }) {
  return <div className="admin-empty">{props.label}</div>;
}

/**
 * The overview keeps the first screen focused on actionable KPI and moderation
 * entry points, while chart-heavy analytics are loaded after the shell paints.
 */
export function AdminOverviewPage() {
  const user = useAdminAuthStore((state) => state.user);
  const error = useAdminAuthStore((state) => state.error);
  const authError = resolveAdminOverviewAuthError({
    userDisplayName: user?.displayName ?? null,
    authError: error
  });
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<"day" | "month" | "year">("day");
  const [activityMode, setActivityMode] = useState<"day" | "month" | "year">("day");
  const [shouldLoadCharts, setShouldLoadCharts] = useState(false);

  const analyticsQuery = useQuery({
    queryKey: ["admin-overview", "analytics"],
    queryFn: () => apiClient.getAdminAnalyticsOverview()
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-overview", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });
  const recentSessionsQuery = useQuery({
    queryKey: ["admin-overview", "auth-sessions"],
    queryFn: () => apiClient.getAdminAuthSessions()
  });

  const analytics = analyticsQuery.data?.item;
  const siteSettings = siteSettingsQuery.data?.item;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setShouldLoadCharts(true);
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const registrationSeries = useMemo(() => {
    if (!analytics) {
      return [];
    }
    const source =
      registrationMode === "day"
        ? analytics.registration.daily
        : registrationMode === "month"
          ? analytics.registration.monthly
          : analytics.registration.yearly;

    return source.map((item) => ({
      label: formatPeriodLabel(item.periodStart, registrationMode),
      value: item.value
    }));
  }, [analytics, registrationMode]);

  const activitySeries = useMemo(() => {
    if (!analytics) {
      return [];
    }
    const source =
      activityMode === "day"
        ? analytics.activity.daily
        : activityMode === "month"
          ? analytics.activity.monthly
          : analytics.activity.yearly;

    return source.map((item) => ({
      label: formatPeriodLabel(item.periodStart, activityMode),
      value: item.value
    }));
  }, [analytics, activityMode]);

  const contentMixData = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return [
      { type: "飞友圈动态", value: analytics.contentMix.moments },
      { type: "文章", value: analytics.contentMix.articles },
      { type: "飞行器", value: analytics.contentMix.aircraft },
      { type: "榜单", value: analytics.contentMix.rankings }
    ];
  }, [analytics]);

  const moderationBarData = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return [
      { domain: "文章/动态", status: "待审", value: analytics.moderation.posts.pending },
      { domain: "文章/动态", status: "通过", value: analytics.moderation.posts.approved },
      { domain: "文章/动态", status: "驳回/隐藏", value: analytics.funnel.posts.rejectedOrHidden },
      { domain: "评论", status: "待审", value: analytics.moderation.comments.pending },
      { domain: "评论", status: "通过", value: analytics.moderation.comments.approved },
      { domain: "评论", status: "驳回/隐藏", value: analytics.funnel.comments.rejectedOrHidden },
      { domain: "评测", status: "待审", value: analytics.moderation.reviews.pending },
      { domain: "评测", status: "通过", value: analytics.moderation.reviews.approved },
      { domain: "评测", status: "驳回/隐藏", value: analytics.funnel.reviews.rejectedOrHidden },
      { domain: "品牌申请", status: "待审", value: analytics.moderation.brandApplications.pending },
      { domain: "品牌申请", status: "通过", value: analytics.moderation.brandApplications.approved },
      { domain: "品牌申请", status: "驳回/隐藏", value: analytics.funnel.brandApplications.rejectedOrHidden },
      { domain: "机型投稿", status: "待审", value: analytics.moderation.submissions.pending },
      { domain: "机型投稿", status: "通过", value: analytics.moderation.submissions.approved },
      { domain: "机型投稿", status: "驳回/隐藏", value: analytics.funnel.submissions.rejectedOrHidden },
      { domain: "榜单", status: "待审", value: analytics.moderation.rankings.pending },
      { domain: "榜单", status: "通过", value: analytics.moderation.rankings.approved },
      { domain: "榜单", status: "驳回/隐藏", value: analytics.funnel.rankings.rejectedOrHidden },
      { domain: "评分对象", status: "待审", value: analytics.moderation.ratingTargets.pending },
      { domain: "评分对象", status: "通过", value: analytics.moderation.ratingTargets.approved },
      { domain: "评分对象", status: "驳回/隐藏", value: analytics.funnel.ratingTargets.rejectedOrHidden }
    ];
  }, [analytics]);

  const funnelData = useMemo(() => {
    if (!analytics) {
      return [];
    }

    const queueEntered =
      analytics.funnel.posts.queueEntered +
      analytics.funnel.comments.queueEntered +
      analytics.funnel.reviews.queueEntered +
      analytics.funnel.submissions.queueEntered +
      analytics.funnel.brandApplications.queueEntered +
      analytics.funnel.ratingTargets.queueEntered;
    const pending =
      analytics.funnel.posts.pending +
      analytics.funnel.comments.pending +
      analytics.funnel.reviews.pending +
      analytics.funnel.submissions.pending +
      analytics.funnel.brandApplications.pending +
      analytics.funnel.ratingTargets.pending;
    const approved =
      analytics.funnel.posts.approved +
      analytics.funnel.comments.approved +
      analytics.funnel.reviews.approved +
      analytics.funnel.submissions.approved +
      analytics.funnel.brandApplications.approved +
      analytics.funnel.ratingTargets.approved;
    const rejectedOrHidden =
      analytics.funnel.posts.rejectedOrHidden +
      analytics.funnel.comments.rejectedOrHidden +
      analytics.funnel.reviews.rejectedOrHidden +
      analytics.funnel.submissions.rejectedOrHidden +
      analytics.funnel.brandApplications.rejectedOrHidden +
      analytics.funnel.ratingTargets.rejectedOrHidden;

    return [
      { stage: "进入队列", value: queueEntered },
      { stage: "待处理", value: pending },
      { stage: "已通过", value: approved },
      { stage: "驳回/隐藏", value: rejectedOrHidden }
    ];
  }, [analytics]);

  async function updateSiteSettings(partial: Record<string, boolean>) {
    if (!siteSettings) {
      return;
    }

    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      await apiClient.updateSiteSettings(buildSiteSettingsUpdate(siteSettings, partial));
      await Promise.all([siteSettingsQuery.refetch(), analyticsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  const moderationCards = [
    {
      key: "article",
      title: "文章审核",
      description: "文章发布队列独立查看，不再和飞友圈动态混在一起。",
      enabled: siteSettings?.articleModerationEnabled ?? true,
      pendingCount: analytics?.moderation.posts.pending ?? 0,
      onEnable: async () => updateSiteSettings({ articleModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ articleModerationEnabled: false })
    },
    {
      key: "moment",
      title: "飞友圈动态",
      description: "动态审核入口独立存在，和文章审核完全分开。",
      enabled: siteSettings?.momentModerationEnabled ?? true,
      pendingCount: analytics?.moderation.posts.pending ?? 0,
      onEnable: async () => updateSiteSettings({ momentModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ momentModerationEnabled: false })
    },
    {
      key: "comment",
      title: "评论审核",
      description: "评论和回复使用统一审核开关，和各审核页保持同步。",
      enabled: siteSettings?.commentModerationEnabled ?? true,
      pendingCount: analytics?.moderation.comments.pending ?? 0,
      onEnable: async () => updateSiteSettings({ commentModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ commentModerationEnabled: false })
    },
    {
      key: "brand",
      title: "品牌申请",
      description: "品牌申请从机型投稿里拆分出来，走独立审核队列。",
      enabled: siteSettings?.brandModerationEnabled ?? true,
      pendingCount: analytics?.moderation.brandApplications.pending ?? 0,
      onEnable: async () => updateSiteSettings({ brandModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ brandModerationEnabled: false })
    },
    {
      key: "model",
      title: "机型投稿",
      description: "飞行器和机型投稿走自己的审核开关。",
      enabled: siteSettings?.modelModerationEnabled ?? true,
      pendingCount: analytics?.moderation.submissions.pending ?? 0,
      onEnable: async () => updateSiteSettings({ modelModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ modelModerationEnabled: false })
    },
    {
      key: "ranking",
      title: "榜单审核",
      description: "社区榜单的创建和发布开关。",
      enabled: siteSettings?.rankingModerationEnabled ?? true,
      pendingCount: analytics?.moderation.rankings.pending ?? 0,
      onEnable: async () => updateSiteSettings({ rankingModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ rankingModerationEnabled: false })
    },
    {
      key: "ratingTarget",
      title: "评分对象",
      description: "评分对象是否单独进入审核列表。",
      enabled: siteSettings?.ratingTargetModerationEnabled ?? true,
      pendingCount: analytics?.moderation.ratingTargets.pending ?? 0,
      onEnable: async () => updateSiteSettings({ ratingTargetModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ ratingTargetModerationEnabled: false })
    }
  ];

  const quickEntries = [
    {
      title: "文章审核",
      description: "文章发布队列与人工开关",
      to: ADMIN_ROUTE_PATHS.moderationArticles,
      icon: <FlagOutlined />
    },
    {
      title: "品牌申请",
      description: "品牌申请独立审核入口",
      to: ADMIN_ROUTE_PATHS.moderationBrandApplications,
      icon: <FileSearchOutlined />
    },
    {
      title: "机型投稿",
      description: "投稿队列与状态处理",
      to: ADMIN_ROUTE_PATHS.moderationAircraftSubmissions,
      icon: <ClockCircleOutlined />
    },
    {
      title: "评分对象",
      description: "评分对象审核独立页面",
      to: ADMIN_ROUTE_PATHS.moderationRatingTargets,
      icon: <SafetyCertificateOutlined />
    },
    {
      title: "创建文章",
      description: "官方文章创建与发布",
      to: ADMIN_ROUTE_PATHS.operationsArticles,
      icon: <FlagOutlined />
    },
    {
      title: "创建榜单",
      description: "官方榜单创建与编排",
      to: ADMIN_ROUTE_PATHS.operationsRankings,
      icon: <TrophyOutlined />
    }
  ];

  const pendingEntries = [
    {
      title: "待审核文章",
      description: "直接打开文章审核列表并带上待审核筛选",
      to: `${ADMIN_ROUTE_PATHS.moderationArticles}?status=pending`,
      count: analytics?.moderation.posts.pending ?? 0,
      icon: <FlagOutlined />
    },
    {
      title: "待审核动态",
      description: "直接进入飞友圈动态待审核队列",
      to: `${ADMIN_ROUTE_PATHS.moderationMoments}?status=pending`,
      count: analytics?.moderation.posts.pending ?? 0,
      icon: <ReadOutlined />
    },
    {
      title: "待审核评论",
      description: "统一处理帖子、机型、榜单与评分对象评论",
      to: `${ADMIN_ROUTE_PATHS.moderationComments}?status=pending`,
      count: analytics?.moderation.comments.pending ?? 0,
      icon: <CommentOutlined />
    },
    {
      title: "待审核品牌申请",
      description: "集中处理待审核品牌申请",
      to: `${ADMIN_ROUTE_PATHS.moderationBrandApplications}?status=pending`,
      count: analytics?.moderation.brandApplications.pending ?? 0,
      icon: <FileSearchOutlined />
    },
    {
      title: "待审核机型投稿",
      description: "查看机型投稿待审核列表",
      to: `${ADMIN_ROUTE_PATHS.moderationAircraftSubmissions}?status=submitted`,
      count: analytics?.moderation.submissions.pending ?? 0,
      icon: <ClockCircleOutlined />
    },
    {
      title: "待审核榜单",
      description: "快速进入社区榜单审核队列",
      to: `${ADMIN_ROUTE_PATHS.moderationRankings}?status=pending`,
      count: analytics?.moderation.rankings.pending ?? 0,
      icon: <TrophyOutlined />
    },
    {
      title: "待审核评分对象",
      description: "查看榜单条目待审核内容",
      to: `${ADMIN_ROUTE_PATHS.moderationRatingTargets}?status=pending`,
      count: analytics?.moderation.ratingTargets.pending ?? 0,
      icon: <SafetyCertificateOutlined />
    },
    {
      title: "待处理举报",
      description: "集中查看被举报的内容与评论",
      to: ADMIN_ROUTE_PATHS.moderationReports,
      count: null,
      icon: <FileSearchOutlined />
    }
  ];

  const topStats = [
    { label: "本月新增注册", value: analytics?.registration.month ?? 0, icon: <BarChartOutlined /> },
    { label: "本年新增注册", value: analytics?.registration.year ?? 0, icon: <BarChartOutlined /> },
    { label: "文章总数", value: analytics?.totals.articles ?? 0, icon: <FlagOutlined /> },
    { label: "动态总数", value: analytics?.totals.moments ?? 0, icon: <CommentOutlined /> },
    { label: "飞行器总数", value: analytics?.totals.aircraft ?? 0, icon: <RocketOutlined /> },
    { label: "榜单总数", value: analytics?.totals.rankings ?? 0, icon: <TrophyOutlined /> }
  ];

  return (
    <AdminPage
      actions={
        <Space wrap>
          <Button href={ADMIN_ROUTE_PATHS.moderation} type="primary">
            打开审核分区
          </Button>
          <Button href={ADMIN_ROUTE_PATHS.operations}>进入运营分区</Button>
        </Space>
      }
      description={`当前管理员：${user?.displayName ?? "系统管理员"}。首屏优先展示待处理入口和核心指标，重图表按需加载。`}
      title="数据总览"
    >
      {authError ? <div className="admin-login__error">{authError}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}
      {analyticsQuery.isError ? <div className="admin-login__error">{analyticsQuery.error.message}</div> : null}

      <div className="admin-overview-footer-grid admin-overview-footer-grid--top">
        {topStats.map((item) => (
          <div className="admin-overview-kpi" key={item.label}>
            <div className="admin-overview-kpi__icon">{item.icon}</div>
            <div>
              <div className="admin-overview-kpi__label">{item.label}</div>
              <div className="admin-overview-kpi__value">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <AdminPanel description="把高频人工处理队列集中到一屏，减少后台运营时来回找入口。" title="待处理快捷入口">
        <div className="admin-section-grid admin-section-grid--compact">
          {pendingEntries.map((entry) => (
            <Link className="admin-section-card admin-section-card--compact" key={entry.to} to={entry.to}>
              <div className="admin-section-card__icon">{entry.icon}</div>
              <div className="admin-section-card__title">
                {entry.title}
                {entry.count !== null ? ` · ${entry.count}` : ""}
              </div>
              <div className="admin-section-card__description">{entry.description}</div>
            </Link>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel description="缩成更紧凑的次级入口，避免首屏入口卡片压住数据。" title="常用入口">
        <div className="admin-section-grid admin-section-grid--compact">
          {quickEntries.map((entry) => (
            <Link className="admin-section-card admin-section-card--compact" key={entry.to} to={entry.to}>
              <div className="admin-section-card__icon">{entry.icon}</div>
              <div className="admin-section-card__title">{entry.title}</div>
              <div className="admin-section-card__description">{entry.description}</div>
            </Link>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel description="按内容类型拆开的独立审核开关。" title="审核开关矩阵">
        <div className="admin-moderation-grid admin-moderation-grid--wide">
          {moderationCards.map((item) => (
            <AdminModerationCard
              autoCopy="关闭人工审核后，将直接走自动发布链路。"
              description={item.description}
              enabled={item.enabled}
              key={item.key}
              loading={isSavingSettings}
              manualCopy="开启人工审核后，将进入对应的待处理队列。"
              onDisable={() => {
                void item.onDisable();
              }}
              onEnable={() => {
                void item.onEnable();
              }}
              pendingCount={item.pendingCount}
              title={item.title}
            />
          ))}
        </div>
      </AdminPanel>

      <div className="admin-overview-layout">
        <AdminPanel
          actions={
            <Segmented
              onChange={(value) => {
                setRegistrationMode(value as "day" | "month" | "year");
              }}
              options={[
                { label: "日", value: "day" },
                { label: "月", value: "month" },
                { label: "年", value: "year" }
              ]}
              value={registrationMode}
            />
          }
          description="最近一段时间内的注册变化。"
          title="注册趋势"
        >
          {registrationSeries.length > 0 ? (
            shouldLoadCharts ? (
              <Suspense fallback={<ChartLoadingFallback label="正在加载注册图表..." />}>
                <RegistrationTrendChart data={registrationSeries} />
              </Suspense>
            ) : (
              <ChartLoadingFallback label="正在加载注册图表..." />
            )
          ) : (
            <Empty description="暂无注册数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </AdminPanel>

        <AdminPanel description="内容发布结构占比。" title="内容构成">
          {contentMixData.length > 0 ? (
            shouldLoadCharts ? (
              <Suspense fallback={<ChartLoadingFallback label="正在加载内容构成图表..." />}>
                <ContentMixChart data={contentMixData} />
              </Suspense>
            ) : (
              <ChartLoadingFallback label="正在加载内容构成图表..." />
            )
          ) : (
            <Empty description="暂无内容数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </AdminPanel>

        <AdminPanel
          actions={
            <Segmented
              onChange={(value) => {
                setActivityMode(value as "day" | "month" | "year");
              }}
              options={[
                { label: "日", value: "day" },
                { label: "月", value: "month" },
                { label: "年", value: "year" }
              ]}
              value={activityMode}
            />
          }
          description="按会话去重计算的活跃用户变化。"
          title="活跃趋势"
        >
          {activitySeries.length > 0 ? (
            shouldLoadCharts ? (
              <Suspense fallback={<ChartLoadingFallback label="正在加载活跃图表..." />}>
                <ActivityTrendChart data={activitySeries} />
              </Suspense>
            ) : (
              <ChartLoadingFallback label="正在加载活跃图表..." />
            )
          ) : (
            <Empty description="暂无活跃数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </AdminPanel>

        <AdminPanel description="聚合各业务的审核漏斗，用来判断堆积位置。" title="审核漏斗">
          {funnelData.length > 0 ? (
            shouldLoadCharts ? (
              <Suspense fallback={<ChartLoadingFallback label="正在加载审核漏斗..." />}>
                <ModerationFunnelChart data={funnelData} />
              </Suspense>
            ) : (
              <ChartLoadingFallback label="正在加载审核漏斗..." />
            )
          ) : (
            <Empty description="暂无审核数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </AdminPanel>
      </div>

      <AdminPanel description="横向比较主要业务的待审、通过和驳回/隐藏数量。" title="审核状态对比">
        {moderationBarData.length > 0 ? (
          shouldLoadCharts ? (
            <Suspense fallback={<ChartLoadingFallback label="正在加载审核状态对比图..." />}>
              <ModerationStatusChart data={moderationBarData} />
            </Suspense>
          ) : (
            <ChartLoadingFallback label="正在加载审核状态对比图..." />
          )
        ) : (
          <Empty description="暂无审核数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </AdminPanel>

      <AdminPanel description="最近的管理端和用户登录设备，用来观察异常登录与端侧分布。" title="最近登录设备 / IP">
        {recentSessionsQuery.isError ? (
          <div className="admin-login__error">{resolveRecentSessionsPanelMessage(recentSessionsQuery.error)}</div>
        ) : null}
        {!recentSessionsQuery.isError && (recentSessionsQuery.data?.items.length ?? 0) === 0 ? (
          <Empty description="暂无最近登录记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : null}
        {(recentSessionsQuery.data?.items.length ?? 0) > 0 ? (
          <div className="admin-session-list">
            {recentSessionsQuery.data?.items.slice(0, 8).map((item) => (
              <div className="admin-session-card" key={item.id}>
                <div className="admin-session-card__head">
                  <div>
                    <div className="admin-session-card__title">{formatAdminSessionIdentity(item)}</div>
                    <div className="admin-session-card__meta">
                      {formatAdminSessionScope(item.scope)} · {formatAdminSessionStatus(item.status)}
                    </div>
                  </div>
                  <div className="admin-session-card__status">{item.clientIp ?? "未知 IP"}</div>
                </div>
                <div className="admin-session-card__detail">{item.deviceLabel ?? item.userAgent ?? "未识别设备"}</div>
                <div className="admin-session-card__meta">
                  创建于 {formatAdminSessionTime(item.createdAt)} · 最近活跃 {formatAdminSessionTime(item.lastSeenAt)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </AdminPanel>
    </AdminPage>
  );
}
