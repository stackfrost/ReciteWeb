'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  panelName?: string;
  fallbackText?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WorkbenchErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[WorkbenchErrorBoundary:${this.props.panelName || 'Panel'}] Uncaught render error:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-950 text-zinc-200 text-center font-sans select-none border border-rose-500/20 rounded-lg m-1">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-3">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            {this.props.panelName ? `${this.props.panelName} Encountered an Issue` : 'Panel Rendering Interrupted'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed font-mono">
            {this.state.error?.message || 'A transient rendering error occurred while processing document structures.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Reload Panel</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WorkbenchErrorBoundary;
