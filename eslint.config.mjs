import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // 全局忽略
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.config.*",
      "eslint.config.*",
      "drizzle.config.ts",
      "vitest.config.ts",
      // 未纳入 tsconfig 的测试目录
      "packages/schemas/tests/**",
      "packages/http-client/tests/**",
      // AI 工具技能目录（非项目业务代码）
      ".opencode/**",
      ".claude/**",
      ".codex/**",
      ".cursor/**",
      "tmp/**"
    ]
  },

  // 全局基础规则
  js.configs.recommended,

  // 所有 TS/TSX 文件：类型检查 + 推荐规则
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"]
  })),
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" }
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } }
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-constant-condition": ["error", { checkLoops: false }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-throw-literal": "error"
    }
  },

  // React 文件（web + admin）
  {
    files: ["apps/web/**/*.tsx", "apps/admin/**/*.tsx"],
    plugins: {
      react,
      "react-hooks": reactHooks
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      ...react.configs.flat.recommended?.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "off"
    }
  },

  // 测试文件宽松规则
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "**/tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off"
    }
  },
  {
    files: ["apps/web/e2e/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off"
    }
  },

  // Prettier 冲突兜底（放最后）
  prettier
);
