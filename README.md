# 飞加网

当前 worktree：`E:\CodeStore\feijia\.worktrees\mvp2-auth-identity`

这是基于 MVP 第 1 迭代骨架继续推进的第 2 迭代账号与身份体系实现分支，已覆盖：

- `web` 手机号 + 图形验证码 + 本地 mock 短信验证码登录 / 注册
- `admin` 账号密码登录
- `HttpOnly Cookie` 会话恢复
- `/auth/me`、退出登录、受保护接口与管理员校验

## 快速开始

```bash
bun install
bun run dev:server
bun run dev:web
bun run dev:admin
```

## 访问地址

- Web: `http://localhost:3000`
- Admin: `http://localhost:3001`
- Server: `http://localhost:3002`

请使用上面的 `localhost` 地址联调。当前服务端只对默认的 Web/Admin 开发来源开放带凭证的跨域请求，用于写入和恢复 `HttpOnly Cookie` 会话。

## 默认开发登录方式

### Web

1. 进入 `http://localhost:3000/login`
2. 获取图形验证码
3. 发送短信验证码
4. 使用接口返回的 `mockCode` 完成登录

### Admin

1. 进入 `http://localhost:3001/admin/login`
2. 使用默认管理员账号登录：

```txt
account: admin
password: Admin#123
```

## 验证

```bash
bun run check
```

## 当前限制

- 图形验证码与短信验证码仍采用内存存储，服务重启后会失效
- 用户与 session 已落数据库，服务端重启后可继续复用
- 短信验证码为开发态 mock，不接真实短信服务
