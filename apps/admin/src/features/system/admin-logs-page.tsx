import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Empty, Input, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import type { AdminLogCategory } from "@feijia/schemas";
import { AdminMetric, AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type AdminLogsOverview = Awaited<ReturnType<typeof apiClient.getAdminLogsOverview>>["item"];
type AdminLogsCategorySummary = AdminLogsOverview["categories"][number];
type AdminLogFileItem = Awaited<ReturnType<typeof apiClient.listAdminLogFiles>>["items"][number];
type AdminLogEntryItem = Awaited<ReturnType<typeof apiClient.getAdminLogEntries>>["items"][number];

function formatDateTime(value?: string | null) {
  if (!value) {
    return "未知";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", { hour12: false });
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getCategoryLabel(category: AdminLogCategory) {
  switch (category) {
    case "app":
      return "应用日志";
    case "request":
      return "请求日志";
    case "error":
      return "错误日志";
    case "security":
      return "安全日志";
    default:
      return category;
  }
}

function getLevelColor(level: AdminLogEntryItem["level"]) {
  switch (level) {
    case "ERROR":
      return "error";
    case "WARN":
      return "warning";
    case "INFO":
      return "processing";
    case "DEBUG":
      return "default";
    default:
      return "default";
  }
}

export function AdminLogsPage() {
  const [selectedCategory, setSelectedCategory] = useState<AdminLogCategory | undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<string | undefined>(undefined);
  const [levelFilter, setLevelFilter] = useState<AdminLogEntryItem["level"] | undefined>(undefined);
  const [searchValue, setSearchValue] = useState("");
  const [searchDraft, setSearchDraft] = useState("");

  const overviewQuery = useQuery({
    queryKey: ["admin-logs", "overview"],
    queryFn: () => apiClient.getAdminLogsOverview()
  });

  const activeCategory = selectedCategory ?? overviewQuery.data?.item.categories[0]?.category;

  const filesQuery = useQuery({
    enabled: Boolean(activeCategory),
    queryKey: ["admin-logs", "files", activeCategory ?? "none"],
    queryFn: () => {
      if (!activeCategory) {
        throw new Error("未选择日志分类");
      }

      return apiClient.listAdminLogFiles({
        category: activeCategory,
        limit: 50
      });
    }
  });

  const activeFile = selectedFile ?? filesQuery.data?.items[0]?.fileName;

  const entriesQuery = useQuery({
    enabled: Boolean(activeCategory && activeFile),
    queryKey: ["admin-logs", "entries", activeCategory ?? "none", activeFile ?? "none", levelFilter ?? "all", searchValue],
    queryFn: () => {
      if (!activeCategory || !activeFile) {
        throw new Error("未选择日志文件");
      }

      return apiClient.getAdminLogEntries({
        category: activeCategory,
        fileName: activeFile,
        limit: 200,
        level: levelFilter ?? undefined,
        search: searchValue.trim() ? searchValue.trim() : undefined
      });
    }
  });

  useEffect(() => {
    if (!selectedCategory && overviewQuery.data?.item.categories[0]?.category) {
      setSelectedCategory(overviewQuery.data.item.categories[0].category);
    }
  }, [overviewQuery.data?.item.categories, selectedCategory]);

  useEffect(() => {
    if (!selectedFile && filesQuery.data?.items[0]?.fileName) {
      setSelectedFile(filesQuery.data.items[0].fileName);
    }
  }, [filesQuery.data?.items, selectedFile]);

  const categories = useMemo(() => overviewQuery.data?.item.categories ?? [], [overviewQuery.data?.item.categories]);
  const files = useMemo(() => filesQuery.data?.items ?? [], [filesQuery.data?.items]);
  const entries = useMemo(() => entriesQuery.data?.items ?? [], [entriesQuery.data?.items]);
  const selectedCategorySummary = useMemo(
    () => categories.find((item) => item.category === activeCategory) ?? null,
    [activeCategory, categories]
  );

  const categoryOptions = categories.map((item) => ({
    label: getCategoryLabel(item.category),
    value: item.category
  }));

  const fileOptions = files.map((item) => ({
    label: item.fileName,
    value: item.fileName
  }));

  const fileColumns: ColumnsType<AdminLogFileItem> = [
    {
      title: "文件",
      key: "fileName",
      render: (_, record) => (
        <div className="admin-table-meta">
          <div className="admin-table-title">{record.fileName}</div>
          <div className="admin-table-subtitle">{record.absolutePath}</div>
        </div>
      )
    },
    {
      title: "分类",
      dataIndex: "category",
      key: "category",
      width: 120,
      render: (value: AdminLogCategory) => getCategoryLabel(value)
    },
    {
      title: "大小",
      dataIndex: "sizeBytes",
      key: "sizeBytes",
      width: 120,
      render: (value: number) => formatBytes(value)
    },
    {
      title: "最近更新",
      dataIndex: "modifiedAt",
      key: "modifiedAt",
      width: 180,
      render: (value: string) => formatDateTime(value)
    }
  ];

  const entryColumns: ColumnsType<AdminLogEntryItem> = [
    {
      title: "时间",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 180,
      render: (value: string | null) => formatDateTime(value)
    },
    {
      title: "级别",
      dataIndex: "level",
      key: "level",
      width: 96,
      render: (value: AdminLogEntryItem["level"]) => (
        <Tag color={getLevelColor(value)}>{value ?? "UNKNOWN"}</Tag>
      )
    },
    {
      title: "消息",
      key: "message",
      render: (_, record) => (
        <div className="admin-table-meta">
          <div className="admin-table-title">{record.message}</div>
          <div className="admin-table-subtitle" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {record.raw}
          </div>
        </div>
      )
    }
  ];

  const anyError = overviewQuery.error ?? filesQuery.error ?? entriesQuery.error;

  return (
    <AdminPage
      actions={
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            loading={overviewQuery.isFetching || filesQuery.isFetching || entriesQuery.isFetching}
            onClick={() => {
              void Promise.all([overviewQuery.refetch(), filesQuery.refetch(), entriesQuery.refetch()]);
            }}
          >
            刷新日志
          </Button>
        </Space>
      }
      description="查看服务端日志模式、分类、文件和最近日志行，优先用于排查生产环境文件日志。"
      title="日志监控"
    >
      {anyError ? (
        <Alert
          description={anyError.message}
          message="日志监控接口不可用"
          showIcon
          type="error"
        />
      ) : null}

      <div className="admin-overview-footer-grid admin-overview-footer-grid--top">
        <AdminMetric
          hint="开发环境通常是 console / both，生产环境应重点关注 file / both"
          label="日志模式"
          value={overviewQuery.data?.item.mode ?? "未知"}
        />
        <AdminMetric
          hint="后端限制的单次读取最大行数"
          label="单次读取上限"
          value={overviewQuery.data?.item.maxReadLines ?? 0}
        />
        <AdminMetric
          hint="当前文件的最近日志行数"
          label="最近日志行"
          value={entries.length}
        />
      </div>

      <AdminPanel
        actions={
          <Space wrap>
            <Select
              onChange={(value: AdminLogCategory) => {
                setSelectedCategory(value);
                setSelectedFile(undefined);
              }}
              options={categoryOptions}
              placeholder="选择日志分类"
              style={{ minWidth: 180 }}
              value={activeCategory}
            />
            <Select
              onChange={(value: string) => {
                setSelectedFile(value);
              }}
              options={fileOptions}
              placeholder="选择日志文件"
              style={{ minWidth: 260 }}
              value={activeFile}
            />
          </Space>
        }
        description={`日志目录：${overviewQuery.data?.item.dir ?? "未知"}；当前级别：${overviewQuery.data?.item.level ?? "未知"}`}
        title="日志概览"
      >
        {categories.length === 0 && !overviewQuery.isLoading ? (
          <Empty description="暂无日志分类信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="admin-section-grid admin-section-grid--compact">
            {categories.map((item: AdminLogsCategorySummary) => (
              <button
                key={item.category}
                className="admin-section-card admin-section-card--compact"
                onClick={() => {
                  setSelectedCategory(item.category);
                  setSelectedFile(undefined);
                }}
                style={{
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  border:
                    activeCategory === item.category
                      ? "1px solid rgba(20, 122, 132, 0.18)"
                      : "1px solid rgba(15, 23, 42, 0.08)",
                  background:
                    activeCategory === item.category
                      ? "linear-gradient(135deg, rgba(20, 122, 132, 0.12), rgba(47, 155, 143, 0.08))"
                      : "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(247,250,252,0.92))"
                }}
                type="button"
              >
                <div className="admin-section-card__title">{getCategoryLabel(item.category)}</div>
                <div className="admin-section-card__description">
                  文件 {item.fileCount} 个 · {formatBytes(item.totalSizeBytes)}
                </div>
                <div className="admin-section-card__description">
                  最近文件 {item.latestFileName ?? "暂无"} · {formatDateTime(item.latestFileModifiedAt)}
                </div>
              </button>
            ))}
          </div>
        )}
      </AdminPanel>

      <AdminPanel
        description={
          selectedCategorySummary
            ? `当前分类 ${getCategoryLabel(selectedCategorySummary.category)} 共 ${selectedCategorySummary.fileCount} 个文件。`
            : "按文件查看日志轮转和更新时间。"
        }
        title="日志文件"
      >
        <Table
          columns={fileColumns}
          dataSource={files}
          loading={filesQuery.isLoading}
          locale={{ emptyText: "暂无日志文件" }}
          pagination={false}
          rowKey={(record) => `${record.category}:${record.fileName}`}
          scroll={{ x: 820 }}
          size="middle"
        />
      </AdminPanel>

      <AdminPanel
        actions={
          <Space wrap>
            <Select
              allowClear
              onChange={(value: AdminLogEntryItem["level"]) => {
                setLevelFilter(value ?? undefined);
              }}
              options={[
                { label: "DEBUG", value: "DEBUG" },
                { label: "INFO", value: "INFO" },
                { label: "WARN", value: "WARN" },
                { label: "ERROR", value: "ERROR" }
              ]}
              placeholder="按级别筛选"
              style={{ minWidth: 140 }}
              value={levelFilter}
            />
            <Input.Search
              allowClear
              onChange={(event) => {
                setSearchDraft(event.target.value);
              }}
              onSearch={(value) => {
                setSearchValue(value.trim());
              }}
              placeholder="搜索日志内容"
              style={{ minWidth: 260 }}
              value={searchDraft}
            />
          </Space>
        }
        description={`当前文件：${activeFile ?? "未选择"}${entriesQuery.data ? ` · 总行数 ${entriesQuery.data.totalLines}` : ""}`}
        title="最近日志"
      >
        <Table
          columns={entryColumns}
          dataSource={entries}
          loading={entriesQuery.isLoading}
          locale={{ emptyText: "暂无日志行" }}
          pagination={false}
          rowKey={(record, index) =>
            `${record.timestamp ?? "time"}:${record.level ?? "level"}:${index}`
          }
          scroll={{ x: 960, y: 520 }}
          size="small"
        />
      </AdminPanel>
    </AdminPage>
  );
}
