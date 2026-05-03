import { API_ROUTES } from "@feijia/shared";

export const powerTypePaths = {
  [API_ROUTES.powerTypes.list]: {
    get: {
      tags: ["动力分类"],
      summary: "获取动力分类列表",
      responses: { "200": { description: "动力分类列表" } },
    },
  },
  [API_ROUTES.powerTypes.adminList]: {
    get: {
      tags: ["动力分类"],
      summary: "管理端获取动力分类列表",
      security: [{ cookieAuth: [] }],
      responses: { "200": { description: "动力分类列表" } },
    },
    post: {
      tags: ["动力分类"],
      summary: "新增动力分类",
      security: [{ cookieAuth: [] }],
      responses: { "200": { description: "已创建" }, "400": { description: "参数错误" } },
    },
  },
  [API_ROUTES.powerTypes.adminDetail(":id")]: {
    put: {
      tags: ["动力分类"],
      summary: "更新动力分类",
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "已更新" }, "404": { description: "未找到" } },
    },
  },
} as const;
