import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] Error caught in ${this.props.componentName || "Component"}:`, error, errorInfo);
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-red-50/50 border border-red-100 rounded-2xl text-center space-y-4 max-w-md mx-auto my-4 shadow-xs">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
            ⚠️
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-gray-900 text-sm">
              Ops! Algo deu errado no {this.props.componentName || "Componente"}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Ocorreu um erro inesperado ao renderizar esta seção. Você pode tentar reiniciar o estado ou limpar o cache local.
            </p>
          </div>
          <div className="flex gap-2 justify-center pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Tentar Novamente
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white border border-gray-250 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Recarregar Página
            </button>
          </div>
          {this.state.error && (
            <details className="text-left bg-gray-50 p-3 rounded-lg border border-gray-150 text-[10px] text-gray-400 font-mono max-h-32 overflow-y-auto">
              <summary className="cursor-pointer font-bold select-none mb-1">Ver detalhes do erro</summary>
              <p className="break-all">{this.state.error.message}</p>
              <p className="mt-1 opacity-70">{this.state.error.stack}</p>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
