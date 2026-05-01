# Execution Packet（执行包）

planner 必须为每个待执行任务产出一个 Execution Packet。编排者 spawn 子代理时原样传递给对应实现代理。

---

## 模板

```md
## Execution Packet

### task_id
TASK-XXX

### task_name
<任务名称>

### requirement_ids
REQ-XXX, REQ-YYY

### owner
frontend_implementer / backend_implementer / frontend_ui_worker / frontend_state_worker / frontend_test_worker / backend_api_worker / backend_service_worker / backend_data_worker / backend_test_worker

### parallel_batch
batch-1 / batch-2 / ...

### batch_peers
- 同批次内其它 task_id / owner；无则写“无”

### depends_on
- 无，或列出必须先完成的 task_id / batch_id

### serial_reason
- 可并发则写“无”
- 必须串行时写明真实原因：gate / user_confirm / shared_owner / same_file / contract_dependency / tdd_step / other

### objective
本次子任务的唯一目标（一句话）

### in_scope
- 实现的具体功能点 1
- 实现的具体功能点 2
- ...

### out_of_scope
- 明确不包含的内容 1
- 明确不包含的内容 2
- ...

### input_documents
- requirements: <路径>
- tasks: <路径>
- plan: <路径>
- analysis/research: <路径，可选>
- codex_rules:
  - .codex/skills/behavioral-guidelines/SKILL.md
  - .codex/AGENTS.md
### allowed_paths
- 允许修改的目录 / 文件
- 允许新增的目录 / 文件

### forbidden_paths
- 禁止修改的共享区域
- 其他代理负责的区域
- 高风险配置文件

### dependencies
- 依赖的 API / 契约 / schema
- 依赖的共享类型
- 依赖的上游任务结果
- 依赖的并发批次或串行原因

### acceptance_criteria
- 可验证的验收条件 1
- 可验证的验收条件 2
- ...

### test_strategy
tdd / test_after / manual_only

### handoff_notes
- 对下游 review_qa 的重要说明
- 对其他代理的交接注意事项

### escalation_rule
如需变更共享契约、数据库结构、路由前缀、根配置，必须先回编排者，不得直接修改。
```

---

## 使用方式

1. **planner 产出：** 在计划文档中为每个任务写一个 Execution Packet
2. **编排者传递：** spawn 子代理时，将对应任务的 Execution Packet 作为 input 传入
3. **子代理确认：** 子代理在开工前先输出 Execution Acknowledgement，确认理解与 Execution Packet 一致
4. **review_qa 追踪：** review_qa 用 Execution Packet 中的 acceptance_criteria 验收

---

## 质量要求

- **可追溯：** requirement_ids 必须来自需求文档中的 `REQ-XXX`，不得临时编造
- **边界明确：** in_scope / out_of_scope 必须具体，不允许"相关功能"等模糊表述
- **路径明确：** allowed_paths / forbidden_paths 必须是具体路径，不允许"合理修改"等模糊表述
- **规范完整：** input_documents 必须包含 `.codex/skills/behavioral-guidelines/SKILL.md` 与 `.codex/AGENTS.md`
- **可验收：** acceptance_criteria 必须可验证，不允许"代码质量好"等主观表述
- **可交接：** handoff_notes 必须包含对下游的具体说明
- **可调度：** parallel_batch / depends_on 必须让编排者知道哪些任务能同批 spawn，哪些任务必须等待
- **并发安全：** batch_peers / forbidden_paths 必须让实现代理知道同批还有谁在工作，以及哪些路径不能碰
