import { Component, type ReactNode } from 'react';
import { Alert } from 'antd';

interface Props {
  /** 错误时展示的降级内容，默认显示错误提示 */
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React 错误边界 —— 捕获子组件树中的渲染错误，防止整页白屏。
 * 不捕获事件处理、异步代码或自身错误。
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <Alert
          type="error"
          message="组件渲染失败"
          description={this.state.error?.message || '未知错误'}
          showIcon
          style={{ margin: 16, borderRadius: 12 }}
        />
      );
    }
    return this.props.children;
  }
}
