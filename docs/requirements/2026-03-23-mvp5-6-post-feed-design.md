# MVP 第5/6迭代帖子与内容流设计

**工作区：** `E:\CodeStore\feijia\.worktrees\mvp2-auth-identity`

## 1. 目标

在 MVP 第4迭代基础上新增独立帖子域，打通首页内容分发、帖子发布、帖子详情、单层评论与后台基础审核。

## 2. 设计范围

- `packages/shared`
  - 新增首页与帖子相关路由常量、feed tab 常量
- `packages/schemas`
  - 定义帖子、评论、举报、审核状态及相关输入输出 schema
- `packages/db`
  - 新增帖子、评论、举报表与必要索引、外键约束、种子数据
- `packages/http-client`
  - 提供 feed、帖子详情、发帖、评论、删除、举报、后台审核接口封装
- `apps/server`
  - 新增 `posts` 模块，负责 feed 聚合、帖子详情、评论、举报、后台审核
- `apps/web`
  - `/home` 内容流、帖子详情、发帖表单、评论与回复交互
- `apps/admin`
  - 帖子审核页、评论审核页

## 3. 关键边界

### 3.1 独立帖子域

现有 `reviews` 仅继续承载机型点评，不直接扩成帖子域。帖子域单独建模，避免把“机型口碑”与“社区内容”混成一套状态机。

### 3.2 最小帖子模型

- 帖子字段：
  - `id`
  - `authorId`
  - `title`
  - `content`
  - `status`
  - `commentCount`
  - `reportCount`
  - `createdAt`
  - `updatedAt`
- 评论字段：
  - `id`
  - `postId`
  - `authorId`
  - `parentCommentId`
  - `content`
  - `status`
  - `createdAt`
  - `updatedAt`
- 举报字段：
  - `id`
  - `postId`
  - `reporterId`
  - `reason`
  - `createdAt`

### 3.3 状态策略

- 帖子：`pending | published | rejected | hidden`
- 评论：`visible | hidden`
- 默认新帖进入 `pending`
- Feed 只展示 `published`
- 评论只允许挂在 `published` 帖子下
- 详情页对非作者游客隐藏非公开帖子

### 3.4 Feed 策略

- `recommended`
  - 先用帖子 `commentCount + createdAt` 的简化热度排序
- `latest`
  - 按 `createdAt` 倒序
- 暂不引入点赞、收藏、关注等信号

## 4. 路由设计

### 4.1 Web 路由

- `/home`
- `/posts/:id`

### 4.2 API 路由

- `GET /home/feed`
- `POST /posts`
- `GET /posts/:id`
- `POST /posts/:id/comments`
- `DELETE /posts/:id`
- `DELETE /posts/:id/comments/:commentId`
- `POST /posts/:id/report`
- `GET /admin/posts`
- `PUT /admin/posts/:id/status`
- `GET /admin/post-comments`
- `PUT /admin/post-comments/:id/status`

## 5. 前后台行为

### 5.1 Web

- `/home` 支持 `recommended` / `latest` 切换
- 登录用户可提交纯文本帖子
- 详情页支持评论、单层回复、删除自己的内容、举报入口

### 5.2 Admin

- 查看帖子审核列表
- 查看评论审核列表
- 切换帖子与评论状态
- 用最小筛选区分状态与内容类型

## 6. 明确不做

- 图片/视频上传
- 无限嵌套回复
- 关注流
- 消息通知
- 点赞、收藏、分享
- 复杂推荐

## 7. 风险点

- 帖子与机型点评边界不清会导致后续返工
- 审核状态如果没有统一判定，会出现前后台状态错位
- `/home` 从占位页切到真实 feed，会触及主站入口与导航回归

## 8. 完成定义

- 首页成为可消费内容的主入口
- 已登录用户可发帖、评论、回复并删除自己的内容
- 后台可审核帖子和评论
- Feed、详情、审核三条链路共用统一状态模型
