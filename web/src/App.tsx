import React, { Suspense, lazy, useState, useCallback, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import useGlassTheme from './theme';
import { ThemeContext } from './theme-context';
import type { ThemeMode } from './theme-context';
import AppLayout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Agents = lazy(() => import('./pages/Agents'));
const Archive = lazy(() => import('./pages/Archive'));

/** localStorage 持久化 key */
const THEME_KEY = 'jarvis-theme-mode';

/** 从 localStorage 读取初始主题，默认亮色 */
function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  return 'light';
}

function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#9CD3D3' }}>
      <span>加载中...</span>
    </div>
  );
}

export default function App() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialTheme);
  /** 玻璃主题配置（仅亮色使用） */
  const glassConfig = useGlassTheme();
  /** 暗色模式：纯 antd darkAlgorithm，无组件级玻璃样式 */
  const darkConfig = useMemo<{ theme: { algorithm: typeof theme.darkAlgorithm } }>(
    () => ({ theme: { algorithm: theme.darkAlgorithm } }),
    [],
  );

  /** 切换主题并持久化到 localStorage */
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
      <ConfigProvider {...(themeMode === 'dark' ? darkConfig : glassConfig)}>
        <AntApp>
          <AppLayout>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/archive" element={<Archive />} />
              </Routes>
            </Suspense>
          </AppLayout>
        </AntApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
