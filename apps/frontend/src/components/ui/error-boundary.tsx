"use client";

import React from "react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; errorInfo?: React.ErrorInfo; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log error in development
    logger.error("Error Boundary caught an error:", error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          retry={this.retry}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
function DefaultErrorFallback({ 
  error, 
  errorInfo, 
  retry 
}: { 
  error?: Error; 
  errorInfo?: React.ErrorInfo; 
  retry: () => void;
}) {
  return (
    <div className="app-error-boundary-shell min-h-[400px] flex items-center justify-center p-4">
      <Card className="app-error-boundary-card w-full max-w-md">
        <CardHeader className="text-center">
          <div className="app-error-boundary-icon mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-red-800">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && error && (
            <div className="p-3 bg-slate-800 rounded-md">
              <p className="text-sm font-mono text-red-300 mb-2">Error details:</p>
              <p className="text-xs text-slate-300 break-all">{error.message}</p>
              {errorInfo && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-slate-400">Stack trace</summary>
                  <pre className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={retry} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Async error boundary for handling async operations
export function AsyncErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; errorInfo?: React.ErrorInfo; retry: () => void }>;
}) {
  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

// Page-level error boundary
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // You could send this to an error reporting service
        logger.error("Page error:", error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Component-level error boundary with custom fallback
export function ComponentErrorBoundary({ 
  children, 
  componentName = "Component" 
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  const CustomFallback = ({ retry }: { retry: () => void }) => (
    <div className="app-inline-component-error rounded-lg p-4">
      <div className="flex items-center gap-2 text-red-800 mb-2">
        <AlertTriangle className="w-4 h-4" />
        <span className="font-medium">{componentName} Error</span>
      </div>
      <p className="text-sm text-red-600 mb-3">
        This component failed to load. Please try refreshing the page.
      </p>
      <Button size="sm" variant="outline" onClick={retry}>
        <RefreshCw className="w-3 h-3 mr-1" />
        Retry
      </Button>
    </div>
  );

  return (
    <ErrorBoundary fallback={CustomFallback}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
