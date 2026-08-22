'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useErrorStore } from '@/store/useErrorStore';
import { ErrorDisplayModal } from '@/components/diagnostics/ErrorDisplayModal';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    useErrorStore.getState().reportError(error);
  }

  public render(): ReactNode {
    return (
      <>
        <ErrorDisplayModal/>
        {this.props.children}
      </>
    );
  }
}
