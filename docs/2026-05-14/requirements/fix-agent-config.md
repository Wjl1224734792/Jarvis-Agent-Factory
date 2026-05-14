# 智能体配置页：自定义模型输入 + 保存到文档 + 实时同步

> 日期：2026-05-14 | 版本：1.0

## 问题

1. **模型选择是固定 Select**：`Agents.tsx:399-405` 用硬编码 `available_models` 做下拉选项，用户无法输入自定义模型名
2. **模板 agent 禁止保存**：`okButtonProps={{ disabled: isTemplate }}` 阻止编辑模板 agent 的模型/effort
3. **模型列表硬编码**：`src/engine/gates.ts` 中 `AVAILABLE_MODELS` 是硬编码字符串数组，不反映实际 agent 文档中的 model 值

## 需求

### REQ-001: 模型输入改为 AutoComplete（自定义 + 建议）

- 模型字段从 `<Select>` 改为 `<AutoComplete>`，允许自由输入任意模型名
- 同时保留 `available_models` 作为输入建议（下拉提示）
- 用户可以输入任何模型名，不限于建议列表

### REQ-002: 解除模板 agent 保存禁用

- 移除 `okButtonProps={{ disabled: isTemplate }}`，模板 agent 也可保存
- 移除"模板默认智能体不可编辑"警告提示
- 保存后通过 `syncAgentFile()` 直接将 model/effort 写入对应 `.md` 文档

### REQ-003: 模型列表从 agent 文档动态获取

- 后端 `/api/agents` 返回的 `available_models` 应扫描实际 agent `.md` 文件的 frontmatter `model:` 字段
- 不再依赖硬编码 `AVAILABLE_MODELS`

### REQ-004: 保存即同步文档

- 已有 `syncAgentFile()` 机制（正则替换 frontmatter 中的 model/effort 行）
- 确认保存 → API → `setAgentModel(db)` + `syncAgentFile()` 链路完整

## 改动范围

- `web/src/pages/Agents.tsx` — 模型 Select→AutoComplete，解除模板禁用
- `src/web/routes.ts` — `available_models` 动态获取
- 可能 `src/engine/agent-registry.ts` — 新增获取 agent model 值的辅助函数
