import { useQuery } from "@tanstack/react-query";
import {
  BarChartOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  FileSearchOutlined,
  FlagOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined
} from "@ant-design/icons";
import { Badge, Button, Card, Empty, Segmented, Space } from "antd";
import {
  Suspense,
  lazy,
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";
import {
  adminMessagesQueryKey,
  adminModerationTodosQueryKey,
  getAdminMessageDomainLabel,
  resolveAdminMessageDestination
} from "../messages/admin-message-navigation";
import {
  formatAdminSessionIdentity,
  formatAdminSessionScope,
  formatAdminSessionStatus,
  formatAdminSessionTime,
  resolveAdminOverviewAuthError,
  resolveRecentSessionsPanelMessage
} from "./admin-session-helpers";
import { useAdminAuthStore } from "./auth-store";

type ChartMode = "day" | "month" | "year";
type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};
type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadline) => void,
    options?: { timeout: number }
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const loadOverviewCharts = () => import("./admin-overview-charts");

const RegistrationTrendChart = lazy(() =>
  loadOverviewCharts().then((module) => ({
    default: module.RegistrationTrendChart
  }))
);
const ContentMixChart = lazy(() =>
  loadOverviewCharts().then((module) => ({
    default: module.ContentMixChart
  }))
);
const ActivityTrendChart = lazy(() =>
  loadOverviewCharts().then((module) => ({
    default: module.ActivityTrendChart
  }))
);
const ModerationFunnelChart = lazy(() =>
  loadOverviewCharts().then((module) => ({
    default: module.ModerationFunnelChart
  }))
);
const ModerationStatusChart = lazy(() =>
  loadOverviewCharts().then((module) => ({
    default: module.ModerationStatusChart
  }))
);

function formatPeriodLabel(periodStart: string, mode: ChartMode) {
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

function formatHomeMessageTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const user = useAdminAuthStore((state) => state.user);
  const error = useAdminAuthStore((state) => state.error);
  const authError = resolveAdminOverviewAuthError({
    userDisplayName: user?.displayName ?? null,
    authError: error
  });
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<ChartMode>("day");
  const [activityMode, setActivityMode] = useState<ChartMode>("day");
  const [shouldLoadCharts, setShouldLoadCharts] = useState(false);
  const chartsViewportRef = useRef<HTMLDivElement | null>(null);

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
  const recentMessagesQuery = useQuery({
    queryKey: adminMessagesQueryKey({
      limit: 6
    }),
    queryFn: () =>
      apiClient.listAdminMessages({
        limit: 6
      })
  });
  const todosQuery = useQuery({
    queryKey: adminModerationTodosQueryKey(),
    queryFn: () => apiClient.listAdminModerationTodos()
  });

  const analytics = analyticsQuery.data?.item;
  const siteSettings = siteSettingsQuery.data?.item;

  const requestChartsLoad = useEffectEvent(() => {
    startTransition(() => {
      setShouldLoadCharts(true);
    });
  });

  useEffect(() => {
    if (shouldLoadCharts) {
      return undefined;
    }

    const idleWindow = window as IdleCapableWindow;
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;
    let observer: IntersectionObserver | undefined;

    const chartViewport = chartsViewportRef.current;
    if (chartViewport && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            requestChartsLoad();
            observer?.disconnect();
          }
        },
        {
          rootMargin: "240px 0px"
        }
      );
      observer.observe(chartViewport);
    }

    if (idleWindow.requestIdleCallback) {
      idleHandle = idleWindow.requestIdleCallback(() => {
        requestChartsLoad();
      }, { timeout: 1500 });
    } else {
      timeoutHandle = window.setTimeout(() => {
        requestChartsLoad();
      }, 1500);
    }

    return () => {
      observer?.disconnect();
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [requestChartsLoad, shouldLoadCharts]);

  const registrationSeries = useMemo(() => {
    if (!shouldLoadCharts || !analytics) {
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
  }, [analytics, registrationMode, shouldLoadCharts]);

  const activitySeries = useMemo(() => {
    if (!shouldLoadCharts || !analytics) {
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
  }, [activityMode, analytics, shouldLoadCharts]);

  const contentMixData = useMemo(() => {
    if (!shouldLoadCharts || !analytics) {
      return [];
    }

    return [
      { type: "飞友圈动态", value: analytics.contentMix.moments },
      { type: "文章", value: analytics.contentMix.articles },
      { type: "飞行器", value: analytics.contentMix.aircraft },
      { type: "榜单", value: analytics.contentMix.rankings }
    ];
  }, [analytics, shouldLoadCharts]);

  const moderationBarData = useMemo(() => {
    if (!shouldLoadCharts || !analytics) {
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
      {
        domain: "品牌申请",
        status: "驳回/隐藏",
        value: analytics.funnel.brandApplications.rejectedOrHidden
      },
      { domain: "机型投稿", status: "待审", value: analytics.moderation.submissions.pending },
      { domain: "机型投稿", status: "通过", value: analytics.moderation.submissions.approved },
      { domain: "机型投稿", status: "驳回/隐藏", value: analytics.funnel.submissions.rejectedOrHidden },
      { domain: "榜单", status: "待审", value: analytics.moderation.rankings.pending },
      { domain: "榜单", status: "通过", value: analytics.moderation.rankings.approved },
      { domain: "榜单", status: "驳回/隐藏", value: analytics.funnel.rankings.rejectedOrHidden },
      { domain: "评分对象", status: "待审", value: analytics.moderation.ratingTargets.pending },
      { domain: "评分对象", status: "通过", value: analytics.moderation.ratingTargets.approved },
      {
        domain: "评分对象",
        status: "驳回/隐藏",
        value: analytics.funnel.ratingTargets.rejectedOrHidden
      }
    ];
  }, [analytics, shouldLoadCharts]);

  const funnelData = useMemo(() => {
    if (!shouldLoadCharts || !analytics) {
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
  }, [analytics, shouldLoadCharts]);

  async function updateSiteSettings(partial: Record<string, boolean>) {
    if (!siteSettings) {
      return;
    }

    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      await apiClient.updateSiteSettings(buildSiteSettingsUpdate(siteSettings, partial));
      await Promise.all([
        siteSettingsQuery.refetch(),
        analyticsQuery.refetch(),
        recentMessagesQuery.refetch(),
        todosQuery.refetch()
      ]);
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

  const contentCountTotal =
    (analytics?.totals.articles ?? 0) +
    (analytics?.totals.moments ?? 0) +
    (analytics?.totals.aircraft ?? 0) +
    (analytics?.totals.rankings ?? 0);
  const topStats = [
    {
      label: "待处理审核",
      value: todosQuery.data?.pendingCount ?? 0,
      hint: "与消息中心、待办页共用 messageTodos 聚合口径",
      icon: <FileSearchOutlined />
    },
    {
      label: "未读消息",
      value: recentMessagesQuery.data?.unreadCount ?? 0,
      hint: "系统消息与状态通知实时汇总",
      icon: <CommentOutlined />
    },
    {
      label: "本月新增注册",
      value: analytics?.registration.month ?? 0,
      hint: "首屏保留增长观察位",
      icon: <BarChartOutlined />
    },
    {
      label: "内容存量",
      value: contentCountTotal,
      hint: "文章、动态、机型与榜单合计规模",
      icon: <RocketOutlined />
    }
  ];

  return (
    <AdminPage
      actions={
        <Space wrap>
          <Button href={ADMIN_ROUTE_PATHS.messages} type="primary">
            打开消息中心
          </Button>
          <Button href={ADMIN_ROUTE_PATHS.messageTodos}>查看审核待办</Button>
        </Space>
      }
      description={`当前管理员：${user?.displayName ?? "系统管理员"}。首页待办和最近通知已直接接入真实消息数据，后续消息页和审核页跳转使用同一套落点规则。`}
      title="数据总览"
    >
      {authError ? <div className="admin-login__error">{authError}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}
      {analyticsQuery.isError ? <div className="admin-login__error">{analyticsQuery.error.message}</div> : null}

      <div className="admin-overview-kpi-grid">
        {topStats.map((item) => (
          <Card className="admin-overview-card admin-overview-card--kpi" key={item.label} size="small" variant="outlined">
            <div className="admin-overview-card__kpi-icon">{item.icon}</div>
            <div className="admin-overview-card__kpi-copy">
              <div className="admin-overview-card__eyebrow">{item.label}</div>
              <div className="admin-overview-card__value">{item.value}</div>
              <div className="admin-overview-card__hint">{item.hint}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="admin-overview-home-grid">
        <Card
          className="admin-overview-card"
          extra={<Button href={ADMIN_ROUTE_PATHS.messageTodos} type="link">进入待办页</Button>}
          size="small"
          title="待办总览"
          variant="outlined"
        >
          <div className="admin-overview-link-list">
            {(todosQuery.data?.items.length ?? 0) > 0 ? (
              todosQuery.data?.items.map((item) => {
                const destination = resolveAdminMessageDestination(item.domain, item.navigation);
                return (
                  <Button
                    className="admin-overview-link-item admin-overview-link-item--button"
                    key={`${item.domain}-${item.title}`}
                    onClick={() => {
                      void navigate(destination);
                    }}
                    type="text"
                  >
                    <span className="admin-overview-link-item__icon">
                      <FileSearchOutlined />
                    </span>
                    <span className="admin-overview-link-item__body">
                      <span className="admin-overview-link-item__title">{item.title}</span>
                      <span className="admin-overview-link-item__description">
                        {getAdminMessageDomainLabel(item.domain)}
                      </span>
                    </span>
                    <span className="admin-overview-link-item__meta">{item.pendingCount}</span>
                  </Button>
                );
              })
            ) : (
              <Empty description="当前没有待处理项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </Card>

        <Card
          className="admin-overview-card"
          extra={<Button href={ADMIN_ROUTE_PATHS.messages} type="link">进入消息中心</Button>}
          size="small"
          title="最近通知"
          variant="outlined"
        >
          <div className="admin-overview-placeholder-list">
            {(recentMessagesQuery.data?.items.length ?? 0) > 0 ? (
              recentMessagesQuery.data?.items.map((item) => {
                const destination = resolveAdminMessageDestination(item.domain, item.navigation);
                return (
                  <Button
                    className="admin-overview-message-item"
                    key={item.id}
                    onClick={() => {
                      void navigate(destination);
                    }}
                    type="text"
                  >
                    <span className="admin-overview-message-item__head">
                      <span className="admin-overview-message-item__title">
                        {!item.isRead ? <Badge color="#1677ff" /> : null}
                        {item.title}
                      </span>
                      <span className="admin-overview-message-item__time">
                        {formatHomeMessageTime(item.createdAt)}
                      </span>
                    </span>
                    <span className="admin-overview-message-item__summary">{item.summary}</span>
                  </Button>
                );
              })
            ) : (
              <Empty description="当前没有消息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </Card>
      </div>

      <div className="admin-overview-home-grid">
        <Card
          className="admin-overview-card"
          extra={<Button href={ADMIN_ROUTE_PATHS.operations} type="link">进入运营区</Button>}
          size="small"
          title="快捷入口"
          variant="outlined"
        >
          <div className="admin-overview-quick-grid">
            {quickEntries.map((entry) => (
              <Link className="admin-overview-quick-item" key={entry.to} to={entry.to}>
                <span className="admin-overview-quick-item__icon">{entry.icon}</span>
                <span className="admin-overview-quick-item__title">{entry.title}</span>
                <span className="admin-overview-quick-item__description">{entry.description}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card
          className="admin-overview-card"
          extra={<span className="admin-overview-placeholder-chip">保留现有业务开关</span>}
          size="small"
          title="审核开关矩阵"
          variant="outlined"
        >
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
        </Card>
      </div>

      <div aria-busy={!shouldLoadCharts} className="admin-overview-chart-grid" ref={chartsViewportRef}>
        <Card
          className="admin-overview-card"
          extra={
            <Segmented
              onChange={(value) => {
                startTransition(() => {
                  setRegistrationMode(value as ChartMode);
                });
              }}
              options={[
                { label: "日", value: "day" },
                { label: "月", value: "month" },
                { label: "年", value: "year" }
              ]}
              value={registrationMode}
            />
          }
          size="small"
          title="注册趋势"
          variant="outlined"
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
        </Card>

        <Card className="admin-overview-card" size="small" title="内容构成" variant="outlined">
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
        </Card>

        <Card
          className="admin-overview-card"
          extra={
            <Segmented
              onChange={(value) => {
                startTransition(() => {
                  setActivityMode(value as ChartMode);
                });
              }}
              options={[
                { label: "日", value: "day" },
                { label: "月", value: "month" },
                { label: "年", value: "year" }
              ]}
              value={activityMode}
            />
          }
          size="small"
          title="活跃趋势"
          variant="outlined"
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
        </Card>

        <Card className="admin-overview-card" size="small" title="审核漏斗" variant="outlined">
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
        </Card>
      </div>

      <Card className="admin-overview-card" size="small" title="审核状态对比" variant="outlined">
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
      </Card>

      <Card className="admin-overview-card" size="small" title="最近登录设备 / IP" variant="outlined">
        {recentSessionsQuery.isError ? (
          <div className="admin-login__error">
            {resolveRecentSessionsPanelMessage(recentSessionsQuery.error)}
          </div>
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
                      {formatAdminSessionScope(item.scope)} / {formatAdminSessionStatus(item.status)}
                    </div>
                  </div>
                  <div className="admin-session-card__status">{item.clientIp ?? "未知 IP"}</div>
                </div>
                <div className="admin-session-card__detail">
                  {item.deviceLabel ?? item.userAgent ?? "未识别设备"}
                </div>
                <div className="admin-session-card__meta">
                  创建于 {formatAdminSessionTime(item.createdAt)} / 最近活跃 {formatAdminSessionTime(item.lastSeenAt)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </AdminPage>
  );
}
