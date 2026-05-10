# 智能体配置分类重构 — 任务分解

## TASK-001：后端 — 新增多项目智能体扫描
- **REQ**: REQ-002
- **类型**: DDD（数据层改动）
- **文件**: `src/engine/agent-registry.ts`
- **内容**：新增 `getActiveProjects(db)` 查询 distinct project；修改 `getAgentList` 支持多项目扫描；每个 project agent 的 `category` 设为项目名
- **验收**: `getCategories()` 返回动态项目名称列表

## TASK-002：后端 — API 路由适配新分类
- **REQ**: REQ-002
- **类型**: DDD（数据层改动）
- **文件**: `src/web/routes.ts`
- **内容**：传递 db 参数获取 active projects；合并多项目 agent 列表；返回动态 categories
- **验收**: `/api/agents` 返回的 categories 包含项目名称

## TASK-003：前端 — 分类筛选重构
- **REQ**: REQ-003
- **类型**: 直接开发
- **文件**: `web/src/pages/Agents.tsx`
- **内容**：移除 source 筛选行和相关 state；分类按钮使用动态 categories；卡片来源 tag 改显示分类
- **验收**: 页面显示正确的分类按钮，按项目名筛选生效

## TASK-004：构建验证 + Git 发布
- **REQ**: REQ-004
- **类型**: 直接开发
- **内容**：npm run build + 提交 + 推送 + 打 tag v3.33.0
- **验收**: tag 推送成功，构建通过
