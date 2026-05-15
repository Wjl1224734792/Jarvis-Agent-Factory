# REQ-Commands-Merge: Web 面板指令页面双源合并

**日期**: 2026-05-15
**状态**: confirmed
**类型**: Bug修复 + 功能增强

---

## 背景

Web 面板的"指令"页面（`/commands`）当前存在以下问题：

1. 后端 `GET /api/commands` 只读取项目目录 `.claude/commands/`，不读取全局 `~/.claude/commands/`
2. 当项目 `.claude/commands/` 不存在时（常见情况），API 返回空数组
3. 前端检测到空数组后降级使用硬编码 `FALLBACK_COMMANDS`（28 条），与模板实际 32 条不同步
4. 用户无法区分指令来源，也无法看到全局安装的指令

---

## 需求

### REQ-CM-001: 后端双源读取

`GET /api/commands` 同时读取两个目录的 `.md` 指令文件：

- **项目目录**: `<projectRoot>/.claude/commands/`
- **全局目录**: `~/.claude/commands/`（`homedir()/.claude/commands/`）

返回结构按来源分组：

```json
{
  "project": {
    "name": "jarvis",
    "commands": [...]
  },
  "global": {
    "commands": [...]
  }
}
```

- `project.name` 取项目根目录名（如 `jarvis`）
- 同名指令项目优先，全局列表中排除已被项目覆盖的指令
- 某个目录不存在时对应 commands 为空数组，不报错

**验收标准**:
- 项目 `.claude/commands/` 存在且有文件 → 正常返回项目指令
- 项目 `.claude/commands/` 不存在 → `project.commands: []`，不报错
- 全局 `~/.claude/commands/` 存在且有文件 → 正常返回全局指令
- 同名指令（如 `jarvis.md`）同时存在项目+全局 → 项目列表包含，全局列表排除

### REQ-CM-002: 前端分 Tab 展示

指令页面改为双 Tab 布局：

- **Tab 1**: 项目指令，标签名为项目名（动态，如 "jarvis"），无项目指令时显示空状态提示
- **Tab 2**: 全局指令，标签名为 "全局"

Tab 切换仅影响指令卡片列表的过滤，不重新请求数据。

**验收标准**:
- 两个 Tab 存在，标签名正确
- 切换 Tab 正确显示对应指令列表
- 项目指令为空时，Tab 1 显示空状态提示（如"当前项目无自定义指令，运行 `jarvis add claude` 安装"）
- 全局指令为空时，Tab 2 显示空状态提示

### REQ-CM-003: 移除前端硬编码降级数据

删除 `FALLBACK_COMMANDS` 静态数组。API 失败时的降级策略改为：

- 后端内置 fallback：当双源读取结果均为空时，读取包内置模板目录 `src/templates/platforms/claude/commands/` 作为兜底数据返回
- 前端：API 失败时显示错误状态（重试按钮），不再使用硬编码数据

**验收标准**:
- `FALLBACK_COMMANDS` 从 `web/src/pages/Commands.tsx` 移除
- `usingFallback` 状态移除，相关 "离线数据" Alert 移除
- API 错误时显示错误提示 + 重试按钮
- 后端 fallback 逻辑：双源为空 → 读取包内置模板 → 作为全局指令返回

### REQ-CM-004: 保持现有分类筛选

现有分类 Tab 筛选（全部/开发/测试/审查/架构/任务/平台/重构）保持在全局范围内工作，但改为：

- 分类筛选对当前选中的 Tab（项目/全局）内的指令生效
- 即在项目 Tab 下筛选的是项目指令的分类，全局 Tab 下筛选的是全局指令的分类

**验收标准**:
- 分类筛选与 Tab 联动正确
- 切换 Tab 时重置分类筛选为"全部"

---

## 涉及文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/web/routes.ts` | 修改 | `/api/commands` 改为双源读取+fallback |
| `web/src/pages/Commands.tsx` | 修改 | 分Tab展示，移除FALLBACK_COMMANDS |
| `web/src/api.ts` | 修改 | 更新 `CommandItem` 类型和 `commands()` 返回类型 |

## 非需求（明确排除）

- 不修改 `jarvis init` / `jarvis add` 的安装逻辑
- 不修改命令模板文件本身
- 不添加指令编辑/预览功能
- 不添加指令搜索功能
