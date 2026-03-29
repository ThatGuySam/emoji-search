export type SearchBackend = 'pglite' | 'sqlite'

export type SearchConfig = {
  backend: SearchBackend
  sqliteExperimentEnabled: boolean
  strictBackend: boolean
}

function getSearchParams(
  input?: string,
): URLSearchParams {
  if (typeof input === 'string') {
    return new URLSearchParams(input)
  }

  try {
    return new URLSearchParams(location.search)
  } catch {
    return new URLSearchParams()
  }
}

export function isSqliteExperimentEnabled(): boolean {
  const flag =
    import.meta.env.PUBLIC_ENABLE_SQLITE_EXPERIMENT

  if (flag == null || flag === '') {
    return true
  }

  return flag !== '0' && flag !== 'false'
}

export function resolveSearchConfig(
  input?: string,
): SearchConfig {
  const params = getSearchParams(input)
  const requestedBackend =
    params.get('search_backend')
  const strictBackend =
    params.get('strict_backend') === '1'
  const sqliteExperimentEnabled =
    isSqliteExperimentEnabled()

  const backend: SearchBackend =
    requestedBackend === 'sqlite' &&
    sqliteExperimentEnabled
      ? 'sqlite'
      : 'pglite'

  return {
    backend,
    sqliteExperimentEnabled,
    strictBackend,
  }
}
