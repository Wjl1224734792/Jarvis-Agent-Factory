---
alwaysApply: true
---

# TypeScript Type 与 Interface 使用规范

## 1. 核心决策逻辑 🧠

遵循以下判断流程，可快速决定使用 `type` 还是 `interface`：

```typescript
if (需要 联合类型 | 元组 | 映射/条件类型 | 原始值别名) {
    return "type"; // 必须使用
} 
else if (需要 声明合并 | implements 类实现) {
    return "interface"; // 必须使用
} 
else {
    return "interface"; // 默认推荐：纯对象结构优先使用 interface
}
```

## 2. 必须使用 `type` 的场景

当定义非对象结构或通过逻辑计算得出的类型时，必须使用 `type`。

*   **联合类型 (Unions)**
    ```typescript
    type Status = 'pending' | 'success' | 'error';
    type ID = string | number;
    ```
*   **元组 (Tuples)**
    ```typescript
    type Point = [number, number];
    ```
*   **工具/映射/条件类型 (Utility Types)**
    ```typescript
    type Readonly<T> = { readonly [P in keyof T]: T[P] };
    type IsString<T> = T extends string ? true : false;
    ```
*   **原始类型别名 (Primitives)**
    ```typescript
    type UUID = string;
    type Callback = (data: string) => void;
    ```

## 3. 必须使用 `interface` 的场景

涉及面向对象编程或库定义扩展时，必须使用 `interface`。

*   **声明合并 (Declaration Merging)**
    *   *用于扩展第三方库类型或全局对象。*
    ```typescript
    interface Window {
      __Redux_DevTools__: any; // 向现有 Window 接口添加属性
    }
    ```
*   **类契约 (Class Implementation)**
    *   *虽然 type 也能被 implement，但 interface 语义更明确。*
    ```typescript
    interface Serializable {
      serialize(): string;
    }
    class User implements Serializable { ... }
    ```

## 4. 推荐使用 `interface` 的场景 (默认)

对于**定义纯对象形状 (Shape)**，优先使用 `interface`。

*   **理由**：
    1.  **可读性**：错误提示通常更简洁。
    2.  **扩展性**：`extends` 语法比交叉类型 (`&`) 更符合直觉。
    3.  **性能**：在极大规模项目中，TypeScript 编译器处理 interface 的性能略优于 type 交叉。

```typescript
// ✅ 推荐
interface User {
  id: string;
  name: string;
}

interface Admin extends User {
  permissions: string[];
}

// ❌ 仅在无法使用 interface 时才用 type 定义对象
type UserType = {
  id: string;
  name: string;
}
```

## 5. 总结对照表 📊

| 场景 | 推荐选择 | 核心理由 |
| :--- | :--- | :--- |
| **纯对象 / 数据模型** | **`interface`** | 默认选择，扩展性好，语义清晰 |
| **类 (Class) 契约** | **`interface`** | 符合 OOP 习惯 |
| **联合类型 (`\|`)** | **`type`** | Interface 无法表达 |
| **元组 (`[]`)** | **`type`** | Interface 无法表达 |
| **复杂工具类型** | **`type`** | 涉及映射、条件判断等计算逻辑 |
| **函数类型** | **`type` / `interface`** | 简单函数用 `type`，带属性的函数用 `interface` |

**一句话原则**：
**除非你需要用到 `type` 特有的功能（联合、映射、条件运算），否则定义对象时一律默认使用 `interface`。**
