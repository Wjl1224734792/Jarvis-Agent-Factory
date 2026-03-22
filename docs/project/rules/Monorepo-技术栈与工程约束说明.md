# Monorepo 技术栈与工程约束说明

## 1. 目标

本文档用于说明本项目在 monorepo 结构下的应用边界、共享包边界、依赖约束与目录职责。

## 2. 推荐目录结构

.
├─ apps/
│  ├─ web/                  # 用户端 Web（PC 优先，同时承担移动浏览器适配）
│  ├─ admin/                # 管理后台
│  ├─ server/               # Hono 后端服务
│  └─ mobiles/              # 移动端预留位（暂不实现，仅保留工程占位）
├─ packages/
│  ├─ config/               # tsconfig、eslint、prettier、tailwind 等共享配置
│  ├─ shared/               # 通用常量、工具函数、公共类型辅助
│  ├─ schemas/              # Zod schema、DTO、接口契约、共享类型出口
│  ├─ ui/                   # 通用 UI 基础组件，仅放可稳定复用内容
│  ├─ db/                   # Drizzle schema、迁移、seed、数据库访问基础封装
│  ├─ storage/              # S3 协议统一存储封装
│  └─ http-client/          # 面向 web/admin/mobiles 的统一请求封装
├─ docker/                  # 现有 redis / pgsql / minio 开发容器文件
├─ scripts/                 # 启动、初始化、迁移、seed、清理脚本
├─ .env.example
├─ bunfig.toml
├─ package.json
├─ tsconfig.json

---

## 3. apps 层职责

### 3.1 `apps/web`

负责：

* 用户端主站
* 首页信息流
* 飞友圈
* 飞行器库
* 榜单
* 个人中心
* 发布
* 消息入口
* 移动浏览器适配

这是当前第一优先级应用，因为 PRD 明确是 PC 端优先，但要兼顾移动端体验。

### 3.2 `apps/admin`

负责：

* 仪表盘
* 用户管理
* 内容审核
* 机型管理
* 分类管理
* 举报处理
* 系统通知

这是独立后台，不应和 `web` 混在一个应用里。

### 3.3 `apps/server`

负责：

* REST API
* 鉴权
* OpenAPI
* 文件上传签名
* 审核流
* 点赞/评分/收藏等写操作
* 消息能力
* 异步任务消费
* 后台接口
* 对外统一业务入口

PRD 已明确存在消息系统、审核、异步一致性与后台能力，所以必须单独作为服务应用。

### 3.4 `apps/mobiles`

负责：

* 未来独立移动端应用占位
* 当前仅保留 README、占位 package.json、tsconfig 与依赖说明

当前约束：

* 不实现页面
* 不接入发布
* 不写业务逻辑
* 不复制 `web` 代码硬塞进来
* 只允许引用共享契约和未来公共能力

## 4. packages 层职责

### 4.1 `packages/config`

统一管理：

* tsconfig 基线
* eslint 配置
* prettier 配置
* tailwind 共享基线
* 环境变量约束基线

### 4.2 `packages/shared`

只放：

* 通用常量
* 日期、字符串、分页等纯工具函数
* 枚举映射
* 低业务耦合的小工具

禁止放：

* 具体页面逻辑
* 具体业务 service
* 任何依赖运行环境上下文的代码

### 4.3 `packages/schemas`

只放：

* Zod schema
* DTO
* API 请求/响应契约
* 前后端共享类型
* 环境变量 schema

这是 monorepo 中最核心的“契约层”。

### 4.4 `packages/ui`

只放：

* React 可复用基础组件
* 基于 shadcn/ui 的通用组件封装
* 通用表单壳层
* Button、Dialog、Input、Table、Tabs 等基础能力
* 通用设计 token 封装
* 基于 lucide-react 的图标使用约定

禁止放：

* `web` 专属页面组件
* `admin` 专属业务组件
* 强耦合某个页面流程的组合组件

### 4.5 `packages/db`

只放：

* Drizzle schema
* migration
* seed
* db client 基础封装
* repository 层公共基础能力

约束：

* `web`、`admin`、`mobiles` 不允许直接依赖数据库运行时
* 前端只能依赖由 schema 派生出的类型，不直接碰 db client

### 4.6 `packages/storage`

只放：

* S3 抽象接口
* MinIO / OSS / COS / KODO 的适配实现
* 上传、删除、签名 URL、headObject 等能力

### 4.7 `packages/http-client`

只放：

* 请求实例
* 鉴权头处理
* API client
* 通用错误映射
* web/admin/mobiles 的统一调用入口

## 5. 依赖约束

### 5.1 允许的依赖方向

* `apps/*` 可以依赖 `packages/*`
* `apps/web`、`apps/admin`、`apps/mobiles` 可以依赖 `packages/http-client`、`packages/schemas`、`packages/shared`、`packages/ui`
* `apps/server` 可以依赖 `packages/db`、`packages/storage`、`packages/schemas`、`packages/shared`

### 5.2 禁止的依赖方向

* `apps/web` 禁止直接依赖 `apps/server`
* `apps/admin` 禁止直接依赖 `apps/server`
* `apps/mobiles` 禁止直接依赖任何服务内部模块
* `packages/ui` 禁止依赖某个具体 app 的业务模块
* `packages/shared` 禁止演变成“万能垃圾桶”

## 6. 服务端模块组织约束

`apps/server` 推荐按业务域组织：

```txt
apps/server/src/modules/
├─ auth/
├─ users/
├─ aircraft-models/
├─ reviews/
├─ posts/
├─ rankings/
├─ messages/
├─ notifications/
├─ moderation/
├─ uploads/
└─ admin/
```

每个模块内部建议最少包含：

* `xxx.route.ts`
* `xxx.schema.ts`
* `xxx.service.ts`
* `xxx.repo.ts`

复杂模块再按需增加：

* `xxx.mapper.ts`
* `xxx.policy.ts`
* `xxx.queue.ts`

## 7. 前端组织约束

前端统一采用 React 技术体系：

* `web`、`admin` 统一基于 React
* 路由统一使用 React Router
* 全局状态统一使用 Zustand
* 组件体系统一基于 shadcn/ui
* 图标统一使用 lucide-react

### 7.1 `apps/web`

按业务域拆路由与页面，不按技术层硬拆目录。

推荐按：

* home
* circle
* models
* rankings
* user
* publish
* messages
* settings

### 7.2 `apps/admin`

按后台业务域拆：

* dashboard
* users
* contents
* models
* categories
* reports
* notifications
* system

## 8. 移动端预留策略

虽然当前不实现独立移动端，但因为 PRD 已经明确了移动端布局、飞行器库适配、交互优化与断点要求，所以 monorepo 里必须预留 `apps/mobiles`，否则后续扩展时会重新打断目录边界。

当前阶段正确做法是：

* `web` 先承担移动浏览器响应式适配
* `mobiles` 只占位
* 共享契约、共享请求层、共享工具层先沉淀好
* 等移动端立项后再把业务能力接入 `mobiles`

## 9. 当前项目的落地建议

结合你当前根目录结构，我建议你下一步直接调整为：

* 保留现有 `docker/`
* 保留现有 `docs/`
* 新增 `apps/`
* 新增 `packages/`
* 把未来真正运行的代码全部收敛到 `apps/*`
* 把跨应用共享能力沉淀到 `packages/*`
* 不要一开始就把所有组件和工具都抽共享，先以“稳定复用”为标准

## 10. Monorepo 固定约束

* monorepo 统一使用 Bun Workspace
* `web`、`admin`、`server` 必须独立为 app
* `mobiles` 必须预留，但当前不得实现业务
* `web`、`admin` 前端统一使用 React
* 前端路由统一使用 React Router
* 前端全局状态统一使用 Zustand
* 通用组件体系统一使用 shadcn/ui
* 图标统一使用 lucide-react
* 共享契约必须集中在 `packages/schemas`
* 数据库能力必须集中在 `packages/db`
* 存储能力必须集中在 `packages/storage`
* 前端调用服务必须经过 `packages/http-client`
* Tailwind 仍然必须使用内联类名
* 后端仍然必须使用 Hono + Zod + Drizzle + JWT + CORS + Swagger/OpenAPI
* 开发环境容器仍然保留在根目录 `docker/`
