import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import {
  Button,
  Card,
  Text,
  tokens,
} from '@fluentui/react-components';

type Props = { children: ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card style={{ margin: 32, padding: 24, background: tokens.colorNeutralBackground2 }}>
          <Text weight="semibold" size={500} style={{ marginBottom: 16, display: 'block' }}>
            Something went wrong
          </Text>
          <Text style={{ marginBottom: 16, display: 'block', color: tokens.colorNeutralForeground2 }}>
            {this.state.error?.message}
          </Text>
          <Button appearance="primary" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}
