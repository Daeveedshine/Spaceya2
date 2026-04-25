import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught component error:', { error, errorInfo });
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black text-black dark:text-white flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-rose-600 dark:text-rose-500" />
            </div>
            
            <div>
              <h1 className="text-2xl font-black mb-2 uppercase tracking-tight">Something went wrong</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                We encountered an unexpected error while rendering this page.
              </p>
            </div>
            
            <div className="p-4 bg-zinc-100 dark:bg-black rounded-2xl text-left overflow-hidden">
               <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 break-words line-clamp-3">
                 {this.state.error?.message || 'Unknown error'}
               </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all active:scale-95"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-sm font-bold transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
