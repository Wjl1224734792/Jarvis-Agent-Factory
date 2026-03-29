import { useQuery } from "@tanstack/react-query";
import { Button, Col, Empty, Row, Segmented, Space, Statistic } from "antd";
import { Bar, Column, Funnel, Line, Pie } from "@ant-design/plots";
import { APP_ROUTES } from "@feijia/shared";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  ArrowRightOutlined,
  FireOutlined,
  FileTextOutlined,
  RocketOutlined
} from "@ant-design/icons";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminMetric, AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import {
  formatAdminSessionIdentity,
  formatAdminSessionScope,
  formatAdminSessionStatus,
  formatAdminSessionTime
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
      { type: "动态", value: analytics.contentMix.moments },
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
      { stage: "待审核", value: pending },
      { stage: "已通过", value: approved },
      { stage: "驳回/隐藏", value: rejectedOrHidden }
    ];
  }, [analytics]);

  async function updateModeration(
    key:
      | "postModerationEnabled"
      | "commentModerationEnabled"
      | "reviewModerationEnabled"
      | "submissionModerationEnabled",
    enabled: boolean
  ) {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const current = siteSettingsQuery.data?.item;
      await apiClient.updateSiteSettings({
        postModerationEnabled:
          key === "postModerationEnabled" ? enabled : current?.postModerationEnabled ?? true,
        commentModerationEnabled:
          key === "commentModerationEnabled" ? enabled : current?.commentModerationEnabled ?? true,
        reviewModerationEnabled:
          key === "reviewModerationEnabled" ? enabled : current?.reviewModerationEnabled ?? true,
        submissionModerationEnabled:
          key === "submissionModerationEnabled" ? enabled : current?.submissionModerationEnabled ?? true
      });
      await Promise.all([siteSettingsQuery.refetch(), analyticsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  const moderationCards = analytics
    ? [
        {
          key: "posts",
          title: "帖子审核",
          description: "控制用户动态与文章是否直接发布。",
          enabled: siteSettingsQuery.data?.item.postModerationEnabled ?? true,
          autoCopy: "关闭人工审核后，新的帖子会直接公开。",
          manualCopy: "开启人工审核后，新的帖子先进入待审核队列。",
          pendingCount: analytics.moderation.posts.pending,
          onEnable: async () => updateModeration("postModerationEnabled", true),
          onDisable: async () => updateModeration("postModerationEnabled", false)
        },
        {
          key: "comments",
          title: "评论审核",
          description: "控制评论与回复是否先入审核队列。",
          enabled: siteSettingsQuery.data?.item.commentModerationEnabled ?? true,
          autoCopy: "关闭人工审核后，评论会立即显示。",
          manualCopy: "开启人工审核后，评论会先处于待审核状态。",
          pendingCount: analytics.moderation.comments.pending,
          onEnable: async () => updateModeration("commentModerationEnabled", true),
          onDisable: async () => updateModeration("commentModerationEnabled", false)
        },
        {
          key: "reviews",
          title: "评测审核",
          description: "控制机型评测是否需要人工复核。",
          enabled: siteSettingsQuery.data?.item.reviewModerationEnabled ?? true,
          autoCopy: "关闭人工审核后，评测会直接展示。",
          manualCopy: "开启人工审核后，评测会先进入待审核状态。",
          pendingCount: analytics.moderation.reviews.pending,
          onEnable: async () => updateModeration("reviewModerationEnabled", true),
          onDisable: async () => updateModeration("reviewModerationEnabled", false)
        },
        {
          key: "submissions",
          title: "投稿审核",
          description: "控制飞行器投稿是否自动通过。",
          enabled: siteSettingsQuery.data?.item.submissionModerationEnabled ?? true,
          autoCopy: "关闭人工审核后，投稿会自动进入通过链路。",
          manualCopy: "开启人工审核后，投稿会保留在 submitted 等待处理。",
          pendingCount: analytics.moderation.submissions.pending,
          onEnable: async () => updateModeration("submissionModerationEnabled", true),
          onDisable: async () => updateModeration("submissionModerationEnabled", false)
        }
      ]
    : [];

  const quickActions = [
    {
      key: "official",
      title: "发布官方文章",
      description: "进入官方文章工作台。",
      href: ADMIN_ROUTE_PATHS.officialArticles,
      icon: <FireOutlined />
    },
    {
      key: "posts",
      title: "处理帖子审核",
      description: "集中处理动态和文章审核。",
      href: APP_ROUTES.adminPosts,
      icon: <FileTextOutlined />
    },
    {
      key: "submissions",
      title: "审核飞行器投稿",
      description: "查看待审飞行器投稿。",
      href: ADMIN_ROUTE_PATHS.aircraftSubmissions,
      icon: <RocketOutlined />
    },
    {
      key: "rankings",
      title: "维护官方榜单",
      description: "管理榜单条目与排序。",
      href: APP_ROUTES.adminRankings,
      icon: <ArrowRightOutlined />
    }
  ];

  return (
    <AdminPage
      actions={
        <Space wrap>
          <Button href={ADMIN_ROUTE_PATHS.officialArticles} type="primary">
            发布官方文章
          </Button>
          <Button href={ADMIN_ROUTE_PATHS.aircraftSubmissions}>处理投稿</Button>
        </Space>
      }
      description={`当前管理员：${user?.displayName ?? "系统管理员"}。查看注册、活跃、内容与审核状态。`}
      title="运营总览"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}
      {analyticsQuery.isError ? (
        <div className="admin-login__error">{analyticsQuery.error.message}</div>
      ) : null}

      <section className="admin-overview-hero">
        <div className="admin-overview-hero__copy">
          <div className="admin-overview-hero__eyebrow">运营中心</div>
          <div className="admin-overview-hero__title">把增长、活跃、审核和登录态集中在一个首页。</div>
          <div className="admin-overview-hero__description">
            这里显示注册趋势、活跃变化、内容构成、审核漏斗，以及最近登录设备和 IP。
          </div>
        </div>
        <div className="admin-overview-hero__actions">
          {quickActions.map((item) => (
            <Link className="admin-action-card" key={item.key} to={item.href}>
              <div className="admin-action-card__title">{item.title}</div>
              <div className="admin-action-card__description">{item.description}</div>
              <div className="admin-action-card__meta">
                {item.icon}
                立即进入
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Row className="admin-metric-grid" gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <AdminMetric
            hint={`今日新增 ${analytics?.registration.today ?? 0}`}
            label="用户总数"
            value={analytics?.totals.users ?? 0}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminMetric
            hint={`MAU ${analytics?.activity.mau ?? 0} / YAU ${analytics?.activity.yau ?? 0}`}
            label="DAU"
            value={analytics?.activity.dau ?? 0}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminMetric
            hint={`评论 ${analytics?.totals.pendingComments ?? 0} / 评测 ${analytics?.totals.pendingReviews ?? 0}`}
            label="待审核总数"
            value={analytics?.totals.pendingTotal ?? 0}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <AdminMetric
            hint={`文章 ${analytics?.totals.articles ?? 0} / 动态 ${analytics?.totals.moments ?? 0}`}
            label="内容总量"
            value={(analytics?.totals.articles ?? 0) + (analytics?.totals.moments ?? 0)}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
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
            description="查看最近一段时间内的注册变化。"
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
        </Col>
        <Col xs={24} xl={10}>
          <AdminPanel description="动态、文章、飞行器和榜单的数量占比。" title="内容构成占比">
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
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
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
            description="按会话去重计算的活跃用户趋势。"
            title="活跃用户趋势"
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
        </Col>
        <Col xs={24} xl={10}>
          <AdminPanel description="聚合各业务审核流程，快速判断哪里堆积最多。" title="审核漏斗">
            {funnelData.length > 0 ? (
              <Funnel autoFit colorField="stage" data={funnelData} height={280} xField="stage" yField="value" />
            ) : (
              <Empty description="暂无审核数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </AdminPanel>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <AdminPanel description="比较各业务的待审、通过、驳回/隐藏数量。" title="审核状态对比">
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
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <AdminPanel description="展示最近登录会话的端类型、设备、IP 与最近活跃时间。" title="最近登录设备 / IP">
            {recentSessionsQuery.isError ? (
              <div className="admin-login__error">{recentSessionsQuery.error.message}</div>
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
                    <div className="admin-session-card__detail">
                      {item.deviceLabel ?? item.userAgent ?? "未识别设备"}
                    </div>
                    <div className="admin-session-card__meta">
                      创建于 {formatAdminSessionTime(item.createdAt)} · 最近活跃 {formatAdminSessionTime(item.lastSeenAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </AdminPanel>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {[
          { label: "本月新增注册", value: analytics?.registration.month ?? 0 },
          { label: "本年新增注册", value: analytics?.registration.year ?? 0 },
          { label: "文章总数", value: analytics?.totals.articles ?? 0 },
          { label: "动态总数", value: analytics?.totals.moments ?? 0 },
          { label: "飞行器总数", value: analytics?.totals.aircraft ?? 0 },
          { label: "榜单总数", value: analytics?.totals.rankings ?? 0 }
        ].map((item) => (
          <Col key={item.label} lg={8} sm={12} xl={4} xs={24}>
            <AdminPanel tight>
              <Statistic title={item.label} value={item.value} />
            </AdminPanel>
          </Col>
        ))}
      </Row>

      <AdminPanel description="根据实时待审数量切换审核策略。">
        <div className="admin-moderation-grid">
          {moderationCards.map((item) => (
            <AdminModerationCard
              autoCopy={item.autoCopy}
              description={item.description}
              enabled={item.enabled}
              key={item.key}
              loading={isSavingSettings}
              manualCopy={item.manualCopy}
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
    </AdminPage>
  );
}
