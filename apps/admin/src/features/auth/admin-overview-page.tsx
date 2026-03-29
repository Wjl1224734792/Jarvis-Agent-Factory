import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Segmented, Space } from "antd";
import { Bar, Column, Funnel, Line, Pie } from "@ant-design/plots";
import { useMemo, useState } from "react";
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
import { Link } from "react-router-dom";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminMetric, AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import {
  formatAdminSessionIdentity,
  formatAdminSessionScope,
  formatAdminSessionStatus,
  formatAdminSessionTime,
  resolveAdminOverviewAuthError,
  resolveRecentSessionsPanelMessage
} from "./admin-session-helpers";
import { useAdminAuthStore } from "./auth-store";

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
      时间: formatPeriodLabel(item.periodStart, registrationMode),
      注册数: item.value
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
      时间: formatPeriodLabel(item.periodStart, activityMode),
      活跃用户: item.value
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
      { domain: "帖子", status: "待审", value: analytics.moderation.posts.pending },
      { domain: "帖子", status: "通过", value: analytics.moderation.posts.approved },
      { domain: "帖子", status: "驳回/隐藏", value: analytics.funnel.posts.rejectedOrHidden },
      { domain: "评论", status: "待审", value: analytics.moderation.comments.pending },
      { domain: "评论", status: "通过", value: analytics.moderation.comments.approved },
      { domain: "评论", status: "驳回/隐藏", value: analytics.funnel.comments.rejectedOrHidden },
      { domain: "评测", status: "待审", value: analytics.moderation.reviews.pending },
      { domain: "评测", status: "通过", value: analytics.moderation.reviews.approved },
      { domain: "评测", status: "驳回/隐藏", value: analytics.funnel.reviews.rejectedOrHidden },
      { domain: "投稿", status: "待审", value: analytics.moderation.submissions.pending },
      { domain: "投稿", status: "通过", value: analytics.moderation.submissions.approved },
      { domain: "投稿", status: "驳回/隐藏", value: analytics.funnel.submissions.rejectedOrHidden }
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
      analytics.funnel.submissions.queueEntered;
    const pending =
      analytics.funnel.posts.pending +
      analytics.funnel.comments.pending +
      analytics.funnel.reviews.pending +
      analytics.funnel.submissions.pending;
    const approved =
      analytics.funnel.posts.approved +
      analytics.funnel.comments.approved +
      analytics.funnel.reviews.approved +
      analytics.funnel.submissions.approved;
    const rejectedOrHidden =
      analytics.funnel.posts.rejectedOrHidden +
      analytics.funnel.comments.rejectedOrHidden +
      analytics.funnel.reviews.rejectedOrHidden +
      analytics.funnel.submissions.rejectedOrHidden;

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
      await apiClient.updateSiteSettings({
        ...siteSettings,
        ...partial
      });
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
      description: "文章发布单独查看，避免和飞友圈动态混在一个队列里。",
      enabled: siteSettings?.articleModerationEnabled ?? siteSettings?.postModerationEnabled ?? true,
      pendingCount: analytics?.moderation.posts.pending ?? 0,
      onEnable: async () => updateSiteSettings({ articleModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ articleModerationEnabled: false })
    },
    {
      key: "moment",
      title: "飞友圈动态",
      description: "飞友圈动态单独审核，和文章入口拆开。",
      enabled: siteSettings?.momentModerationEnabled ?? siteSettings?.postModerationEnabled ?? true,
      pendingCount: analytics?.moderation.posts.pending ?? 0,
      onEnable: async () => updateSiteSettings({ momentModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ momentModerationEnabled: false })
    },
    {
      key: "comment",
      title: "评论审核",
      description: "评论和回复的审核统一收口到这一类开关。",
      enabled: siteSettings?.commentModerationEnabled ?? true,
      pendingCount: analytics?.moderation.comments.pending ?? 0,
      onEnable: async () => updateSiteSettings({ commentModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ commentModerationEnabled: false })
    },
    {
      key: "brand",
      title: "品牌申请",
      description: "品牌申请与机型投稿彻底分离，单独进入品牌审核。",
      enabled: siteSettings?.brandModerationEnabled ?? true,
      pendingCount: 0,
      onEnable: async () => updateSiteSettings({ brandModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ brandModerationEnabled: false })
    },
    {
      key: "model",
      title: "机型投稿",
      description: "飞行器和机型投稿的审核开关。",
      enabled: siteSettings?.modelModerationEnabled ?? siteSettings?.submissionModerationEnabled ?? true,
      pendingCount: analytics?.moderation.submissions.pending ?? 0,
      onEnable: async () => updateSiteSettings({ modelModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ modelModerationEnabled: false })
    },
    {
      key: "ranking",
      title: "榜单审核",
      description: "社区榜单的创建和发布开关。",
      enabled: siteSettings?.rankingModerationEnabled ?? true,
      pendingCount: 0,
      onEnable: async () => updateSiteSettings({ rankingModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ rankingModerationEnabled: false })
    },
    {
      key: "rankingItem",
      title: "榜单条目",
      description: "榜单条目是否单独进入审核队列。",
      enabled: siteSettings?.rankingItemModerationEnabled ?? siteSettings?.rankingModerationEnabled ?? true,
      pendingCount: 0,
      onEnable: async () => updateSiteSettings({ rankingItemModerationEnabled: true }),
      onDisable: async () => updateSiteSettings({ rankingItemModerationEnabled: false })
    }
  ];

  const quickEntries = [
    {
      title: "审核分区",
      description: "把文章、动态、品牌申请、机型投稿、评论、榜单拆开处理。",
      to: ADMIN_ROUTE_PATHS.moderation,
      icon: <SafetyCertificateOutlined />
    },
    {
      title: "创建文章",
      description: "进入官方文章工作台。",
      to: ADMIN_ROUTE_PATHS.operationsArticles,
      icon: <FlagOutlined />
    },
    {
      title: "创建飞行器",
      description: "品牌搜索选择和机型建档入口。",
      to: ADMIN_ROUTE_PATHS.operationsAircraft,
      icon: <RocketOutlined />
    },
    {
      title: "创建榜单",
      description: "集中处理榜单创建和条目编排。",
      to: ADMIN_ROUTE_PATHS.operationsRankings,
      icon: <TrophyOutlined />
    },
    {
      title: "品牌申请",
      description: "单独查看品牌申请审核。",
      to: ADMIN_ROUTE_PATHS.moderationBrandApplications,
      icon: <FileSearchOutlined />
    },
    {
      title: "机型投稿",
      description: "单独查看机型投稿队列。",
      to: ADMIN_ROUTE_PATHS.moderationAircraftSubmissions,
      icon: <ClockCircleOutlined />
    }
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
      description={`当前管理员：${user?.displayName ?? "系统管理员"}。这里把总览、审核、运营和管理的第一层入口重新放到一个清晰的首页。`}
      title="数据总览"
    >
      {authError ? <div className="admin-login__error">{authError}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}
      {analyticsQuery.isError ? <div className="admin-login__error">{analyticsQuery.error.message}</div> : null}

      <section className="admin-overview-hero">
        <div className="admin-overview-hero__copy">
          <div className="admin-overview-hero__eyebrow">四区总览</div>
          <div className="admin-overview-hero__title">把数据、审核、运营和管理的主入口摆到同一层。</div>
          <div className="admin-overview-hero__description">
            首页不再堆叠彼此无关的按钮，而是优先展示增长和待处理数据，再给出四个分区里最常用的入口。
          </div>
        </div>
        <div className="admin-overview-hero__actions">
          {quickEntries.map((entry) => (
            <Link className="admin-action-card" key={entry.to} to={entry.to}>
              <div className="admin-action-card__title">{entry.title}</div>
              <div className="admin-action-card__description">{entry.description}</div>
              <div className="admin-action-card__meta">
                {entry.icon}
                立即进入
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="admin-overview-metrics">
        <div className="admin-overview-metrics__primary">
          <AdminMetric
            hint={`今日新增 ${analytics?.registration.today ?? 0}`}
            label="注册用户总数"
            value={analytics?.totals.users ?? 0}
          />
        </div>
        <AdminMetric
          hint={`MAU ${analytics?.activity.mau ?? 0} / YAU ${analytics?.activity.yau ?? 0}`}
          label="DAU"
          value={analytics?.activity.dau ?? 0}
        />
        <AdminMetric
          hint={`评论 ${analytics?.totals.pendingComments ?? 0} / 评测 ${analytics?.totals.pendingReviews ?? 0}`}
          label="待处理总数"
          value={analytics?.totals.pendingTotal ?? 0}
        />
        <AdminMetric
          hint={`文章 ${analytics?.totals.articles ?? 0} / 动态 ${analytics?.totals.moments ?? 0}`}
          label="内容总量"
          value={(analytics?.totals.articles ?? 0) + (analytics?.totals.moments ?? 0)}
        />
      </div>

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
          description="最近一段时间的注册变化。"
          title="注册趋势"
        >
          {registrationSeries.length > 0 ? (
            <Column
              autoFit
              color="#1f78ff"
              data={registrationSeries}
              height={280}
              xAxis={{ labelAutoRotate: false }}
              xField="时间"
              yAxis={{ nice: true }}
              yField="注册数"
            />
          ) : (
            <Empty description="暂无注册数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </AdminPanel>

        <AdminPanel description="内容发布结构占比。" title="内容构成">
          {contentMixData.length > 0 ? (
            <Pie
              angleField="value"
              autoFit
              colorField="type"
              data={contentMixData}
              height={280}
              innerRadius={0.62}
              label={{ text: "type", style: { fontSize: 12 } }}
              legend={{ color: { title: false, position: "bottom" } }}
            />
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
            <Line
              autoFit
              color="#14b8a6"
              data={activitySeries}
              height={280}
              point={{ size: 3 }}
              smooth
              xField="时间"
              yAxis={{ nice: true }}
              yField="活跃用户"
            />
          ) : (
            <Empty description="暂无活跃数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </AdminPanel>

        <AdminPanel description="聚合各业务的审核漏斗，用来判断堆积位置。" title="审核漏斗">
          {funnelData.length > 0 ? (
            <Funnel autoFit colorField="stage" data={funnelData} height={280} xField="stage" yField="value" />
          ) : (
            <Empty description="暂无审核数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </AdminPanel>
      </div>

      <AdminPanel description="按内容类型拆开的独立审核开关。接口未完全落地时，文章/动态会兼容共用现有帖子开关。" title="审核开关矩阵">
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

      <AdminPanel description="横向比较主要业务的待审、通过和驳回/隐藏数量。" title="审核状态对比">
        {moderationBarData.length > 0 ? (
          <Bar
            autoFit
            data={moderationBarData}
            height={320}
            isStack
            legend={{ color: { position: "bottom" } }}
            seriesField="status"
            xField="value"
            yField="domain"
          />
        ) : (
          <Empty description="暂无审核数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </AdminPanel>

      <AdminPanel description="最近的管理员和用户登录设备，用来观察异常登录与端侧分布。" title="最近登录设备 / IP">
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
                      {formatAdminSessionScope(item.scope)} 路 {formatAdminSessionStatus(item.status)}
                    </div>
                  </div>
                  <div className="admin-session-card__status">{item.clientIp ?? "未知 IP"}</div>
                </div>
                <div className="admin-session-card__detail">{item.deviceLabel ?? item.userAgent ?? "未识别设备"}</div>
                <div className="admin-session-card__meta">
                  创建于 {formatAdminSessionTime(item.createdAt)} 路 最近活跃 {formatAdminSessionTime(item.lastSeenAt)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </AdminPanel>

      <div className="admin-overview-footer-grid">
        {[
          { label: "本月新增注册", value: analytics?.registration.month ?? 0, icon: <BarChartOutlined /> },
          { label: "本年新增注册", value: analytics?.registration.year ?? 0, icon: <BarChartOutlined /> },
          { label: "文章总数", value: analytics?.totals.articles ?? 0, icon: <FlagOutlined /> },
          { label: "动态总数", value: analytics?.totals.moments ?? 0, icon: <CommentOutlined /> },
          { label: "飞行器总数", value: analytics?.totals.aircraft ?? 0, icon: <RocketOutlined /> },
          { label: "榜单总数", value: analytics?.totals.rankings ?? 0, icon: <TrophyOutlined /> }
        ].map((item) => (
          <div className="admin-overview-kpi" key={item.label}>
            <div className="admin-overview-kpi__icon">{item.icon}</div>
            <div>
              <div className="admin-overview-kpi__label">{item.label}</div>
              <div className="admin-overview-kpi__value">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}
