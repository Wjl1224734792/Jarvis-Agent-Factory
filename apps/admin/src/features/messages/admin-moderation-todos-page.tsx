import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Empty,
  List,
  Space,
  Statistic
} from "antd";
import { useNavigate } from "react-router-dom";
import { AdminPage } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import {
  adminMessagesQueryKey,
  adminModerationTodosQueryKey,
  getAdminMessageDomainLabel,
  resolveAdminMessageDestination
} from "./admin-message-navigation";

export function AdminModerationTodosPage() {
  const navigate = useNavigate();
  const todosQuery = useQuery({
    queryKey: adminModerationTodosQueryKey(),
    queryFn: () => apiClient.listAdminModerationTodos()
  });
  const unreadMessagesQuery = useQuery({
    queryKey: adminMessagesQueryKey({
      readStatus: "unread",
      limit: 1
    }),
    queryFn: () =>
      apiClient.listAdminMessages({
        readStatus: "unread",
        limit: 1
      })
  });

  return (
    <AdminPage
      actions={
        <Space wrap>
          <Button href={ADMIN_ROUTE_PATHS.messages}>查看消息中心</Button>
          <Button href={ADMIN_ROUTE_PATHS.overview} type="primary">
            返回首页
          </Button>
        </Space>
      }
      description="待办独立于已读状态，始终按业务对象是否仍待处理来聚合。这里直接复用后端 messageTodos 聚合结果。"
      title="审核待办"
    >
      <Breadcrumb
        items={[
          { title: "后台" },
          { title: "数据总览" },
          { title: "审核待办" }
        ]}
      />

      <div className="admin-message-stat-grid">
        <Card className="admin-overview-card" size="small" variant="outlined">
          <Statistic
            loading={todosQuery.isLoading}
            title="待处理总数"
            value={todosQuery.data?.pendingCount ?? 0}
          />
        </Card>
        <Card className="admin-overview-card" size="small" variant="outlined">
          <Statistic
            loading={todosQuery.isLoading}
            title="待办域数量"
            value={todosQuery.data?.items.length ?? 0}
          />
        </Card>
        <Card className="admin-overview-card" size="small" variant="outlined">
          <Statistic
            loading={unreadMessagesQuery.isLoading}
            title="关联未读消息"
            value={unreadMessagesQuery.data?.unreadCount ?? 0}
          />
        </Card>
      </div>

      <Card className="admin-overview-card" size="small" title="待办列表" variant="outlined">
        <List
          bordered
          dataSource={todosQuery.data?.items ?? []}
          locale={{ emptyText: "当前没有待处理项" }}
          renderItem={(item) => {
            const destination = resolveAdminMessageDestination(item.domain, item.navigation);
            return (
              <List.Item
                actions={[
                  <Button
                    key="open"
                    onClick={() => {
                      void navigate(destination);
                    }}
                    type="link"
                  >
                    打开队列
                  </Button>
                ]}
              >
                <List.Item.Meta
                  description={getAdminMessageDomainLabel(item.domain)}
                  title={item.title}
                />
                <Badge count={item.pendingCount} overflowCount={99} showZero />
              </List.Item>
            );
          }}
          rowKey={(item) => `${item.domain}-${item.title}`}
          size="small"
        />
        {!todosQuery.isLoading && (todosQuery.data?.items.length ?? 0) === 0 ? (
          <Empty description="当前没有待处理项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : null}
      </Card>
    </AdminPage>
  );
}
