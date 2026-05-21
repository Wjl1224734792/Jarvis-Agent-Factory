---
name: repowiki
description: 项目知识库——持久化、可搜索的 Markdown Wiki，支持增/查/改/删/健康检查
model: deepseek-v4-pro
argument-hint: [add <title> | ingest <title> | query <keyword> | list | read <page> | delete <page> | lint]
allowed-tools: Read, Bash, Write, Edit, Glob, Grep, Skill, Agent, AskUserQuestion, WebFetch, WebSearch, mcp__jarvis-engine__session_join, mcp__jarvis-engine__repowiki_add, mcp__jarvis-engine__repowiki_ingest, mcp__jarvis-engine__repowiki_query, mcp__jarvis-engine__repowiki_list, mcp__jarvis-engine__repowiki_read, mcp__jarvis-engine__repowiki_delete, mcp__jarvis-engine__repowiki_lint
version: "4.6.0"
updated: "2026-05-21"
---

# 项目知识库（RepoWiki）

持久化项目知识库，存储在 `.jarvis/wiki/pages/` 目录下。支持创建、追加、搜索、浏览、删除和健康检查。

## 步骤 0：注册引擎会话

```
mcp__jarvis-engine__session_join({ platform: "claude" })
```

---

## 子命令

### add — 快速创建页面

新建单页。若 slug 已存在则拒绝，提示使用 `ingest` 追加。

```
mcp__jarvis-engine__repowiki_add({
  title: "页面标题",
  content: "Markdown 格式的页面内容",
  tags: ["tag1", "tag2"],
  category: "architecture"
})
```

### ingest — 创建或追加

创建新页或追加内容到已有页面（带时间戳合并）。适用场景：会话知识捕获、增量记录。

```
mcp__jarvis-engine__repowiki_ingest({
  title: "页面标题",
  content: "追加的 Markdown 内容",
  tags: ["tag1"],
  category: "decision",
  sources: ["session-abc123"],
  confidence: "high"
})
```

### query — 搜索

关键字+标签搜索，按相关度排序返回摘要片段。纯文本匹配（非向量搜索）。

```
mcp__jarvis-engine__repowiki_query({
  query: "搜索关键词",
  tags: ["tag1"],
  category: "architecture",
  limit: 10
})
```

### list — 列出全部

列出所有页面（不含正文内容）。

```
mcp__jarvis-engine__repowiki_list()
```

### read — 读取页面

读取完整页面内容，含 frontmatter 元数据。

```
mcp__jarvis-engine__repowiki_read({ page: "page-slug" })
```

### delete — 删除页面

不可逆删除。

```
mcp__jarvis-engine__repowiki_delete({ page: "page-slug" })
```

### lint — 健康检查

检测孤立页、陈旧页（30天未更新）、损坏引用、超大页（>10KB）、低置信度页。

```
mcp__jarvis-engine__repowiki_lint()
```

---

## 分类体系

| 分类 | 用途 |
|------|------|
| `architecture` | 架构决策、组件关系 |
| `decision` | 技术决策记录（ADR） |
| `pattern` | 设计模式、代码约定 |
| `debugging` | 调试经验、已知问题 |
| `environment` | 环境配置、工具链 |
| `session-log` | 会话日志（自动捕获） |
| `reference` | 参考资料、外部链接 |
| `convention` | 命名规范、编码标准 |

## 使用场景

- **记录架构决策**: `ingest` → `category: "decision"`, `confidence: "high"`
- **捕获调试经验**: `ingest` → `category: "debugging"`
- **查询历史决策**: `query` → `category: "decision"`
- **会话知识持久化**: `ingest` → `category: "session-log"`, 带 `sources` 记录来源会话 ID
- **知识库健康维护**: `lint` → 修复发现的问题

## 红线

- Wiki 数据存储在 `.jarvis/wiki/` 下，不纳入 Git 版本控制
- `add` 拒绝覆盖已有页面；追加内容请用 `ingest`
- 纯文本关键字搜索，无向量嵌入
- 最大页面大小 10KB，超出会在 lint 中报告
- 文件级互斥锁（5s 超时）保证并发安全
