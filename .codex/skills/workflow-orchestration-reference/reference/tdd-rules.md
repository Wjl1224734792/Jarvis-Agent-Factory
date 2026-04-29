# TDD 规则（Red / Green / Refactor）

## test_strategy

`planner` 为每条实现类任务指定 `test_strategy` 之一：

| 取值 | 含义 |
|------|------|
| `tdd` | 测试驱动：先失败用例，再最小实现，再按需重构 |
| `test_after` | 实现后补测或扩展现有测试，仍须在交付前跑通 |
| `manual_only` | 仅手工/浏览器验证；须写明范围与限制（默认少用） |

## tdd 执行顺序

1. **Red**：新增或修改测试，使当前行为**明确失败**（断言目标行为或拒绝错误行为）；运行对应测试命令并保留失败输出或日志说明。
2. **Green**：编写**最小**生产代码令该测试通过；不顺带做大范围重构。
3. **Refactor**：在测试仍绿的前提下整理结构、去重、命名；若有行为变化须回到 Red。

## 编排者 spawn 顺序（tdd 任务）

同一任务内部必须串行；不同任务只要测试文件、生产文件和共享区域不重叠，就按同一子阶段并发。

```
# Red
spawn agent: test_worker（子任务: 写失败测试；同批 Red 可并发）

# Green（Red 通过后）
spawn agent: 实现 worker（子任务: 最小实现令测试通过；同批 Green 可并发）

# Refactor（Green 通过后）
spawn agent: test_worker（子任务: 整理代码，测试仍绿；同批 Refactor 可并发）
```

前端 test_worker = `frontend_test_worker`，实现 worker = `frontend_ui_worker` / `frontend_state_worker` / `frontend_implementer`
后端 test_worker = `backend_test_worker`，实现 worker = `backend_api_worker` / `backend_service_worker` / `backend_data_worker` / `backend_implementer`

## 约束

- 共享合约、路由前缀、DB schema 等高风险变更若标为 `tdd`，与其实现相关的测试步骤**不要**与另一代理并行抢改同一文件。
- planner 必须把 tdd 任务拆入 `parallel_batches`：Red 批次先于 Green，Green 先于 Refactor；跨任务并发只允许在同一子阶段内发生。
- 同一 TDD 子阶段内，多个任务只有在测试文件、生产文件、共享契约和数据结构都不重叠时才可同批并发。
- 每个 TDD Execution Packet 都必须写明当前子阶段、同批任务和下一阶段依赖，避免编排者临场猜测。
- 无法自动化测试的边界（如纯 UI 动效）可标 `test_after` 或 `manual_only`，并在 `planner` 产出中写清验收方式。
- **完成声明前**须有一次「测试失败 → 同一套测试通过」的可核对记录。

## 评审中的 TDD 检查

`review_qa` 须核对 tdd 任务是否具备 **Red → Green**（及需要的 **Refactor**）证据。若仅有最终实现、缺少失败用例阶段说明，应打回或要求补证据。
