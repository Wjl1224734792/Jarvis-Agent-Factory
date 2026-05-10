import { useMemo } from 'react';
import { theme } from 'antd';
import type { ConfigProviderProps } from 'antd';
import type { ThemeMode } from './theme-context';

const tokenConfig = {
  borderRadius: 12,
  borderRadiusLG: 12,
  borderRadiusSM: 12,
  borderRadiusXS: 12,
  motionDurationSlow: '0.2s',
  motionDurationMid: '0.1s',
  motionDurationFast: '0.05s',
};

/** 根据主题模式返回 ConfigProvider 配置（纯 light/dark，无额外组件样式） */
export default function useAppTheme(mode: ThemeMode): ConfigProviderProps {
  return useMemo(
    () => ({
      theme: {
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: tokenConfig,
      },
    }),
    [mode],
  );
}
