# MVP 第 3 迭代：飞行器库主链路执行计划

## 1. 需求文档路径
- `docs/project/PRDs/飞加网 - 产品需求文档 (PRD) V1.0.md`

## 2. 任务文档路径
- `docs/project/mvp/MVP 第1-第6迭代清单.md`
- `docs/project/mvp/MVP 第1-第6迭代的每轮验收口径.md`
- `docs/project/mvp/mvp-roadmap.md`

## 3. 当前轮次目标
- 打通 `/models` 主链路，让普通用户能查机型、看详情、按类型/品牌/动力筛选；让后台能维护机型与分类基础数据。

## 4. 当前轮次范围
### 范围
- Web：`/models` 路由、列表页、类型/品牌/动力筛选、详情页、参数展示。
- Admin：机型管理、分类管理的最小闭环。
- Server：模型列表/详情/筛选接口，后台机型/分类管理接口。
- Shared：第 3 轮所需路由常量、接口契约、数据表补充字段、seed 数据。

### 非范围
- 推荐算法、榜单、复杂搜索。
- 收藏 / 想买 / 分享的完整闭环，只保留详情页入口位。
- 评分、点评、UGC 联动。
- 高级后台能力：批量导入、审核流、权限细分、操作日志。

## 5. 完成标准
- `/models` 可访问，列表与详情可用。
- 类型、品牌、动力筛选可用，且筛选结果稳定返回。
- 详情页能展示核心参数与详细参数。
- Admin 可新增/编辑/上下架机型，可维护分类。
- 有最小可复现 seed，前后台都能基于同一批数据联调。

## 6. 是否需要先查阅 repo_explorer
- 否。当前仓库结构、现有路由和数据库底座已足够规划。

## 7. 执行代理分工
- `backend_implementer`
  - 负责第 3 轮全部共享收口与后端实现。
  - 包括：`packages/db`、`packages/schemas`、`packages/shared`、`packages/http-client`、`apps/server`。
- `frontend_implementer`
  - 负责 `apps/web` 的 `/models` 用户链路。
  - 负责 `apps/admin` 的机型管理、分类管理页面接入。

## 8. 共享区域改动归属
- 唯一责任方：`backend_implementer`
- 共享区域包括：
  - `packages/db`
  - `packages/schemas`
  - `packages/shared`
  - `packages/http-client`
  - 根级校验命令涉及的公共脚本或配置
- 顺序要求：
  1. 先冻结数据模型、接口契约、路由常量。
  2. 再实现 `apps/server` 读写接口与 seed。
  3. 最后由 `frontend_implementer` 接 `apps/web` 与 `apps/admin`。

## 9. 工作区推荐
- `worktree`
- 原因：本轮跨 `web + admin + server + shared + db`，且共享区必须单人收口，适合隔离式推进。

## 10. 风险提醒
- 机型参数结构若现在收不稳，后续第 4 轮评分/点评会反复返工。
- 品牌与分类关系已在表结构里出现，若后台管理口径和前台筛选口径不一致，会出现筛选失真。
- 详情页“参数展示”若没有统一 schema，前后台会各自拼字段。
- seed 数据过少会导致筛选、分页、管理页联调失真。

## 11. 实现者交接信息
### 顺序
1. `backend_implementer` 先做共享收口与后端接口。
2. 共享契约冻结后，`frontend_implementer` 再做 `web` 与 `admin` 页面。
3. 前后端联调后，再补最小文档与验收记录。

### 可并行部分
- 并行前提：共享契约已冻结。
- 可并行 A：`apps/web` 的 `/models` 列表、筛选、详情页。
- 可并行 B：`apps/admin` 的机型管理、分类管理页面。
- 不可并行：`packages/db`、`packages/schemas`、`packages/shared`、`packages/http-client`。

### 建议任务包
- 包 1：共享收口与后端主链路。
- 包 2：Web `/models` 用户链路。
- 包 3：Admin 机型/分类管理链路。

## 12. 推荐的下一步
- 先把本轮任务包交给 `backend_implementer`，要求其先收敛：
  - 机型/分类数据结构
  - 列表/详情/筛选接口
  - 后台管理接口
  - seed 数据
- 共享契约冻结后，再把前台与后台页面任务交给 `frontend_implementer`。

## 验证命令
- `bun run db:migrate`
- `bun run db:seed`
- `bun run test`
- `bun run typecheck`
- `bun run build`
- 如需整体验证：`bun run check`
