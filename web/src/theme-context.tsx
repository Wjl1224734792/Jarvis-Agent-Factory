import { createContext } from 'react';

/** 主题模式类型 */
export type ThemeMode = 'light' | 'dark';

/** 主题上下文：当前模式 + 切换方法 */
export const ThemeContext = createContext<{
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}>({ themeMode: 'light', setThemeMode: () => {} });
