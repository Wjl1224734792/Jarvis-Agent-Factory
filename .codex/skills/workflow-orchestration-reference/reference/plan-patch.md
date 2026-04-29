# Plan Patch / Contract Change Request

实现阶段若发现必须调整共享契约、数据库结构、路由前缀、根配置等，不得直接修改。须先提交 plan patch 或 contract change request，由编排者决定。

---

## 使用场景

- 共享契约必须调整（接口字段、响应格式等）
- 数据库结构必须调整（新增表、修改字段等）
- 路由前缀必须调整
- 根配置必须调整
- 全局请求客户端必须调整
- 多代理边界必须重新划分

---

## 模板

```md
# Plan Patch / Contract Change Request

## 变更类型
plan_patch / contract_change / schema_change / config_change

## 变更原因
为什么原计划 / 原契约无法继续成立（具体说明）

## 当前阻塞点
- 被阻塞的具体功能
- 被阻塞的具体任务

## 影响范围
- 影响的需求 ID：REQ-XXX, REQ-YYY
- 影响的任务 ID：TASK-XXX, TASK-YYY
- 影响的代理：frontend_implementer, backend_data_worker
- 影响的共享区域：shared/types, database schema

## 建议调整
- 计划调整：<具体描述>
- 责任方调整：<具体描述>
- 顺序调整：<具体描述>
- 契约调整：<具体描述>

## 风险
- 风险 1：<具体描述>
- 风险 2：<具体描述>

## 推荐决策
- 批准 / 拒绝 / 需补充信息
- 建议的处理方式
```

---

## 提交流程

1. **停止实现：** 发现必须变更时，立即停止直接修改
2. **填写模板：** 按模板填写 plan patch 或 contract change request
3. **保存文件：**
   - 计划补丁：`docs/plans/YYYY-MM-DD-<topic>-plan-patch.md`
   - 契约变更：`docs/contracts/YYYY-MM-DD-<topic>-contract-change.md`
4. **通知编排者：** 将文件路径和摘要返回给编排者
5. **等待决策：** 编排者决定是否批准、修改或拒绝
6. **执行决策：** 批准后按调整后的计划继续

---

## 编排者处理流程

1. 收到 plan patch / contract change request
2. 评估影响范围和风险
3. 与用户确认（若涉及需求变更）
4. 若需求变更成立，先更新需求文档与 `REQ-XXX` 追溯关系
5. 更新任务文档 / 计划文档
6. 更新相关 Execution Packet
7. 通知受影响的实现代理
8. 允许继续执行

---

## 注意事项

- 不得"顺便"修改，必须显式提交
- 不得在实现文档中隐含变更
- 变更必须留痕，后续 review_qa 会检查
- 共享区域变更必须指定新的唯一责任方
