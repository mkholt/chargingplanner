import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import {
  Button,
  Card,
  Text,
  tokens,
} from '@fluentui/react-components';

type Props = {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type State = {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card style={{ margin: tokens.spacingHorizontalXXXL, padding: tokens.spacingHorizontalXXL, background: tokens.colorNeutralBackground2 }}>
          <Text weight="semibold" size={500} style={{ marginBottom: tokens.spacingHorizontalL, display: 'block' }}>
            Something went wrong
          </Text>
          <Text style={{ marginBottom: tokens.spacingHorizontalL, display: 'block', color: tokens.colorNeutralForeground2 }}>
            {this.state.error?.message}
          </Text>
          {this.state.error?.stack && (
            <details style={{ marginBottom: tokens.spacingHorizontalL }}>
              <summary style={{ cursor: 'pointer', color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingHorizontalS }}>
                Technical details
              </summary>
              <pre style={{
                fontSize: 12,
                overflow: 'auto',
                maxHeight: 200,
                background: tokens.colorNeutralBackground3,
                padding: tokens.spacingHorizontalS,
                borderRadius: tokens.borderRadiusMedium,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <Button appearance="primary" onClick={() => this.setState({ hasError: false, errorInfo: undefined })}>
            Try again
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}
