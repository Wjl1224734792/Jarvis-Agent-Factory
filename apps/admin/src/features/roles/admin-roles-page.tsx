import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Modal,
  Space,
  Table,
  Tag,
  message
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

/** 角色数据结构 */
interface AdminRoleItem {
  name: string;
  label: string;
  permissions: string[];
  description: string | null;
}

/** 系统内置角色，不可删除 */
const SYSTEM_BUILT_IN_ROLES = new Set(["super_admin", "admin"]);

/** 可选权限列表 */
const AVAILABLE_PERMISSIONS = [
  "content:*",
  "moderation:*",
  "operations:*",
  "overview:view",
  "messages:view",
  "settings:security",
  "settings:ai",
  "system:users"
];

/** 权限标签颜色映射 */
const PERMISSION_TAG_COLORS: Record<string, string> = {
  "content:*": "blue",
  "moderation:*": "orange",
  "operations:*": "green",
  "overview:view": "default",
  "messages:view": "default",
  "settings:security": "red",
  "settings:ai": "purple",
  "system:users": "cyan"
};

/** 角色中文名映射 */
const ROLE_LABEL_MAP: Record<string, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  editor: "编辑",
  moderator: "审核员",
  operator: "运营"
};

/** 角色描述映射 */
const ROLE_DESCRIPTION_MAP: Record<string, string> = {
  super_admin: "拥有全部权限，不可修改",
  admin: "拥有全部权限，不可修改",
  editor: "内容创作与管理",
  moderator: "内容审核与治理",
  operator: "运营工具与发布"
};

const ROLES_QUERY_KEY = ["admin-roles"];

function buildRolesFromResponse(
  data: { roles: Record<string, string[]> } | undefined
): AdminRoleItem[] {
  if (!data?.roles) {
    return [];
  }
  return Object.entries(data.roles).map(([name, permissions]) => ({
    name,
    label: ROLE_LABEL_MAP[name] ?? name,
    permissions,
    description: ROLE_DESCRIPTION_MAP[name] ?? null
  }));
}

export function AdminRolesPage() {
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState<AdminRoleItem | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const rolesQuery = useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: () => apiClient.getAdminRoles()
  });

  const roles = useMemo(
    () => buildRolesFromResponse(rolesQuery.data),
    [rolesQuery.data]
  );

  function handleEdit(role: AdminRoleItem) {
    setEditingRole(role);
    setEditPermissions([...role.permissions]);
  }

  async function handleSave() {
    if (!editingRole) {
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.updateAdminRole(editingRole.name, editPermissions);
      message.success(`角色 "${editingRole.label}" 权限已更新`);
      setEditingRole(null);
      await queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "更新失败";
      message.error(msg);
    } finally {
      setIsSaving(false);
    }
  }

  const columns: ColumnsType<AdminRoleItem> = [
    {
      dataIndex: "name",
      key: "name",
      title: "角色标识",
      width: 140
    },
    {
      dataIndex: "label",
      key: "label",
      title: "中文名",
      width: 120
    },
    {
      dataIndex: "description",
      key: "description",
      title: "描述",
      render: (value: string | null) => value ?? "--"
    },
    {
      dataIndex: "permissions",
      key: "permissions",
      title: "权限列表",
      render: (permissions: string[]) => (
        <Space size={[4, 4]} wrap>
          {permissions.map((perm) => (
            <Tag
              key={perm}
              color={PERMISSION_TAG_COLORS[perm] ?? "default"}
            >
              {perm}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      key: "actions",
      title: "操作",
      width: 100,
      render: (_, record) => {
        const isBuiltin = SYSTEM_BUILT_IN_ROLES.has(record.name);
        return (
          <Button
            disabled={isBuiltin}
            onClick={() => handleEdit(record)}
            size="small"
            title={isBuiltin ? "系统内置角色不可修改" : undefined}
          >
            编辑
          </Button>
        );
      }
    }
  ];

  return (
    <AdminPage title="角色管理">
      {rolesQuery.isError ? (
        <Alert
          description={
            rolesQuery.error instanceof Error
              ? rolesQuery.error.message
              : "角色列表加载失败"
          }
          message="角色列表加载失败"
          showIcon
          type="error"
        />
      ) : null}

      <AdminPanel
        actions={
          <Button onClick={() => void rolesQuery.refetch()}>刷新</Button>
        }
        title="角色列表"
      >
        <Table
          bordered
          columns={columns}
          dataSource={roles}
          locale={{
            emptyText: (
              <Empty
                description="暂无角色数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
          loading={rolesQuery.isLoading || rolesQuery.isFetching}
          rowKey={(record) => record.name}
          size="small"
        />
      </AdminPanel>

      <Modal
        centered
        confirmLoading={isSaving}
        okText="保存"
        onCancel={() => setEditingRole(null)}
        onOk={() => void handleSave()}
        open={Boolean(editingRole)}
        title={`编辑权限 - ${editingRole?.label ?? ""}`}
      >
        <Checkbox.Group
          onChange={(checked) =>
            setEditPermissions(checked as string[])
          }
          options={AVAILABLE_PERMISSIONS}
          value={editPermissions}
        />
      </Modal>
    </AdminPage>
  );
}
