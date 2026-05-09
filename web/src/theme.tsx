import { useMemo } from 'react';
import { theme } from 'antd';
import type { ConfigProviderProps } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => {
  const sharedBorder = {
    border: `${token.lineWidth}px ${token.lineType} ${token.colorBorder}`,
  };
  return {
    sharedBorder,
    progressTrack: css({
      ...sharedBorder,
      marginInlineStart: `calc(-1 * ${token.lineWidth}px)`,
      marginBlockStart: `calc(-1 * ${token.lineWidth}px)`,
    }),
  };
});

export default function useCartoonTheme() {
  const { styles } = useStyles();

  return useMemo(
    () => ({
      theme: {
        algorithm: theme.defaultAlgorithm,
        token: {
          colorText: '#51463B',
          colorPrimary: '#225555',
          colorError: '#DA8787',
          colorInfo: '#9CD3D3',
          colorInfoBorder: '#225555',
          colorBorder: '#225555',
          colorBorderSecondary: '#225555',
          lineWidth: 2,
          lineWidthBold: 2,
          borderRadius: 18,
          borderRadiusLG: 18,
          borderRadiusSM: 18,
          controlHeightSM: 28,
          controlHeight: 36,
          colorBgBase: '#FAFAEE',
        },
        components: {
          Button: {
            primaryShadow: 'none',
            dangerShadow: 'none',
            defaultShadow: 'none',
          },
          Modal: {
            boxShadow: 'none',
          },
          Card: {
            colorBgContainer: '#BBAA99',
          },
          Tooltip: {
            borderRadius: 6,
            colorBorder: '#225555',
            algorithm: true,
          },
          Select: {
            optionSelectedBg: '#CBC4AF',
          },
        },
      },
    }),
    [styles],
  ) as ConfigProviderProps;
}
