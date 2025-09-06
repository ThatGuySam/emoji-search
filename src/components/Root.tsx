import React, { StrictMode } from 'react'
import { App } from '@/components/App'
import { ErrorBoundary } from '@/components/ErrorBoundary'

/**
 * Root
 * Wraps the app with StrictMode and error safety.
 */
export function Root() {
  return (
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  )
}

export default Root


