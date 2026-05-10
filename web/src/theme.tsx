import { useMemo } from 'react';
import { theme } from 'antd';
import type { ConfigProviderProps } from 'antd';
import { createStyles } from 'antd-style';
import clsx from 'clsx';

/**
 * 玻璃风格样式定义
 * 使用 antd-style v4 的 cssVar 获取 CSS 变量，实现亮暗主题自适应
 */
const useStyles = createStyles(({ css, cssVar }) => {
  const glassBorder = {
    boxShadow: [
      `${cssVar.boxShadowSecondary}`,
      `inset 0 0 5px 2px rgba(255, 255, 255, 0.3)`,
      `inset 0 5px 2px rgba(255, 255, 255, 0.2)`,
    ].join(','),
  };

  const glassBox = {
    ...glassBorder,
    background: `color-mix(in srgb, ${cssVar.colorBgContainer} 15%, transparent)`,
    backdropFilter: 'blur(12px)',
  };

  return {
    glassBorder,
    glassBox,
    notBackdropFilter: css({ backdropFilter: 'none' }),
    app: css({ textShadow: '0 1px rgba(0,0,0,0.1)' }),
    cardRoot: css({
      ...glassBox,
      backgroundColor: `color-mix(in srgb, ${cssVar.colorBgContainer} 40%, transparent)`,
    }),
    modalContainer: css({ ...glassBox, backdropFilter: 'none' }),
    buttonRoot: css({ ...glassBorder }),
    buttonRootDefaultColor: css({
      background: 'transparent',
      color: cssVar.colorText,
      '&:hover': {
        background: 'rgba(255,255,255,0.2)',
        color: `color-mix(in srgb, ${cssVar.colorText} 90%, transparent)`,
      },
      '&:active': {
        background: 'rgba(255,255,255,0.1)',
        color: `color-mix(in srgb, ${cssVar.colorText} 80%, transparent)`,
      },
    }),
    dropdownRoot: css({
      ...glassBox,
      borderRadius: cssVar.borderRadiusLG,
      ul: { background: 'transparent' },
    }),
    switchRoot: css({ ...glassBorder, border: 'none' }),
    segmentedRoot: css({
      ...glassBorder,
      background: 'transparent',
      backdropFilter: 'none',
      '& .ant-segmented-thumb': { ...glassBox },
      '& .ant-segmented-item-selected': { ...glassBox },
    }),
  };
});

/**
 * 生成玻璃风格的 ConfigProvider 配置
 * @param styles - useStyles 返回的样式对象
 * @returns 亮色/暗色共用的 component classNames 配置
 */
function buildComponentConfig(styles: ReturnType<typeof useStyles>['styles']): ConfigProviderProps {
  return {
    button: {
      classNames: {
        root: clsx(styles.buttonRoot, styles.buttonRootDefaultColor),
      },
    },
    card: {
      classNames: {
        root: styles.cardRoot,
      },
    },
    modal: {
      classNames: {
        container: styles.modalContainer,
      },
    },
    dropdown: {
      classNames: {
        root: styles.dropdownRoot,
      },
    },
    select: {
      classNames: {
        popup: {
          root: styles.dropdownRoot,
        },
      },
    },
    switch: {
      classNames: {
        root: styles.switchRoot,
      },
    },
    segmented: {
      classNames: {
        root: styles.segmentedRoot,
      },
    },
  };
}

const tokenConfig = {
  borderRadius: 12,
  borderRadiusLG: 12,
  borderRadiusSM: 12,
  borderRadiusXS: 12,
  motionDurationSlow: '0.2s',
  motionDurationMid: '0.1s',
  motionDurationFast: '0.05s',
};

/**
 * 玻璃主题 hook
 * @param isDark - 是否为暗色模式
 * @returns ConfigProviderProps 供 ConfigProvider 消费
 */
export default function useGlassTheme(isDark: boolean): ConfigProviderProps {
  const { styles } = useStyles();

  const componentConfig = useMemo(() => buildComponentConfig(styles), [styles]);

  return useMemo<ConfigProviderProps>(
    () => ({
      theme: {
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: tokenConfig,
      },
      ...componentConfig,
    }),
    [isDark, componentConfig],
  );
}
