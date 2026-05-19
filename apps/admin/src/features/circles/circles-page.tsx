import { useQuery } from "@tanstack/react-query";
import { Button, Space, Table, Tag, Popconfirm, message } from "antd";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

export function CirclesPage() {
  const circlesQuery = useQuery({
    queryKey: ["admin-circles"],
    queryFn: () => (apiClient as any).listCircles({ sort: "latest" }) as Promise<{ items: Array<Record<string, unknown>> }>,
  });

  const items = circlesQuery.data?.items ?? [];

  return (
    <AdminPage title="圈子管理" subtitle="管理所有飞友圈，包括编辑、禁用圈子">
      <AdminPanel>
        <Table
          columns={[
            { title: "名称", dataIndex: "name", key: "name", width: 200,
              render: (name: string, record: any) => (
                <span className="font-medium">{name}</span>
              ),
            },
            { title: "Slug", dataIndex: "slug", key: "slug", width: 150 },
            { title: "加入模式", dataIndex: "joinMode", key: "joinMode", width: 100,
              render: (mode: string) => (
                <Tag color={mode === "free" ? "green" : "orange"}>
                  {mode === "free" ? "自由加入" : "审核加入"}
                </Tag>
              ),
            },
            { title: "成员", dataIndex: "memberCount", key: "memberCount", width: 80 },
            { title: "帖子", dataIndex: "postCount", key: "postCount", width: 80 },
            { title: "创建时间", dataIndex: "createdAt", key: "createdAt", width: 180,
              render: (v: string) => v ? new Date(v).toLocaleString("zh-CN") : "-",
            },
            { title: "操作", key: "action", width: 150,
              render: (_: unknown, record: any) => (
                <Space>
                  <Button size="small" type="link">编辑</Button>
                  <Popconfirm
                    title="确定要删除这个圈子吗？"
                    onConfirm={() => message.info("删除功能待实现")}
                  >
                    <Button danger size="small" type="link">删除</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          dataSource={items}
          loading={circlesQuery.isLoading}
          pagination={{ pageSize: 20 }}
          rowKey="id"
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
