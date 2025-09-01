import React from 'react'

/**
 * ErrorBoundary
 * Simple boundary to prevent total app crashes
 * and show a minimal fallback with reload option.
 */
export class ErrorBoundary
  extends React.Component<
    React.PropsWithChildren<unknown>,
    { hasError: boolean }
  > {
  constructor(props: React.PropsWithChildren<unknown>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  // Intentionally no console noise in prod builds
  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh grid place-content-center p-6">
          <div className="max-w-sm text-center">
            <h1 className="text-lg font-semibold mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              Try reloading the page.
            </p>
            <button
              className="h-10 px-4 rounded-2xl border"
              onClick={() => location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}


