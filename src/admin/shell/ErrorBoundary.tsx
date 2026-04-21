import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = { children: ReactNode };

type State = { hasError: boolean; error: Error | null };

/**
 * Global admin-area error boundary. Catches render-time errors anywhere in the
 * tree and surfaces a minimal recovery UI instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[admin] render error:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const rawMessage = this.state.error?.message ?? 'Unknown error';
    const message =
      rawMessage.length > 240 ? rawMessage.slice(0, 240) + '…' : rawMessage;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full rounded-lg border bg-white shadow-sm p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-slate-900">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              The admin ran into an unexpected error. Reloading usually fixes
              it.
            </p>
          </div>
          <pre className="text-xs font-mono bg-slate-100 border rounded p-3 text-slate-700 whitespace-pre-wrap break-words max-h-40 overflow-auto">
            {message}
          </pre>
          <div className="flex justify-end">
            <Button onClick={this.handleReload}>Reload</Button>
          </div>
        </div>
      </div>
    );
  }
}
