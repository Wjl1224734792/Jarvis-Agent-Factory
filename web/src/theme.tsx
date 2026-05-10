import { theme } from 'antd';
import type { ConfigProviderProps } from 'antd';

/** antd 默认亮色主题配置 */
const defaultTheme: ConfigProviderProps = {
  theme: { algorithm: theme.defaultAlgorithm },
};

export default defaultTheme;
