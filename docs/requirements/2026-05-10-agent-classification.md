# 智能体配置分类重构 + 版本发布

## REQ-001：智能体分类按来源归属动态组织

**现状**：
- 分类按钮显示：`全部、编排、实现、测试、审查、架构、移动端、支撑`（角色分类）
- 来源按钮显示：`全部、模板默认、全局配置、项目配置`（来源筛选）
- 两者重叠，UI 冗余

**需求**：
- 去掉"来源"筛选行
- "分类"按钮改为来源+项目归属维度：
  - `全部` → 显示所有智能体
  - `模板默认` → 模板内建的智能体
  - `全局配置` → 用户目录 `~/.{platform}/agents/` 下的智能体
  - `<项目根目录名>` → 每个已激活项目的 `.{platform}/agents/` 下的智能体（动态生成）

**已激活项目定义**：`pipeline_runs` 表中 `archived=0` 的 distinct `project` 字段

## REQ-002：后端支持多项目智能体扫描

**现状**：`getAgentList(true, root)` 仅扫描当前项目根目录

**需求**：
- 新增多项目扫描：遍历所有 active projects，分别扫描其 `.{platform}/agents/`
- 每个项目级的 agent `category` 字段设为该项目名
- 全局 agent 的 `category` 设为 `全局配置`
- 模板 agent 的 `category` 保持 `模板默认`
- `getCategories()` 返回动态列表：`['全部', '模板默认', '全局配置', ...active_projects]`

## REQ-003：前端分类筛选重构

**需求**：
- 移除 `source` 筛选行及相关 state（`source`, `setSource`）
- 分类按钮使用 `categories` 动态渲染（已存在，只需数据源更新）
- 智能体卡片上的来源 tag 改为显示分类名称

## REQ-004：提交 + 推送 + 打 Tag

**需求**：
- 将上次会话所有修改提交
- 推送到 origin（GitHub）
- 创建语义化版本 tag（v3.33.0）
