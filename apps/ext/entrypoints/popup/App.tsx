import { useMemo, useRef, useState } from 'react'

import { searchEmoji } from '../../lib/search'

function App() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [manualCopy, setManualCopy] = useState<string | null>(null)
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([])
  const results = useMemo(() => searchEmoji(query), [query])

  async function copyEmoji(emoji: string, name: string) {
    try {
      await navigator.clipboard.writeText(emoji)
      setManualCopy(null)
      setStatus(`${name} copied`)
    } catch {
      setManualCopy(emoji)
      setStatus('Automatic copy failed. Use the manual copy field.')
    }
  }

  function focusResult(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), results.length - 1)
    resultRefs.current[nextIndex]?.focus()
  }

  return (
    <main>
      <header className="app-header">
        <div>
          <p className="eyebrow">Private, local search</p>
          <h1>FetchMoji</h1>
        </div>
        <span className="brand-mark" aria-hidden="true">⌕</span>
      </header>

      <search>
        <label htmlFor="emoji-query">Describe the emoji you need</label>
        <input
          id="emoji-query"
          type="search"
          enterKeyHint="search"
          placeholder="Try “awkward” or “celebrate”"
          value={query}
          autoFocus
          onChange={(event) => {
            setQuery(event.target.value)
            setStatus('')
            setManualCopy(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && results.length > 0) {
              event.preventDefault()
              focusResult(0)
            }
          }}
        />
      </search>

      {query.trim() === '' ? (
        <p className="empty-state">Type a feeling, situation, or object.</p>
      ) : results.length === 0 ? (
        <p className="empty-state">No keyword match yet. Try a shorter phrase.</p>
      ) : (
        <section aria-labelledby="results-title">
          <div className="results-heading">
            <h2 id="results-title">Matches</h2>
            <span>{results.length}</span>
          </div>
          <ul className="results" role="list">
            {results.map((result, index) => (
              <li key={result.emoji}>
                <button
                  ref={(node) => { resultRefs.current[index] = node }}
                  type="button"
                  className="result"
                  onClick={() => void copyEmoji(result.emoji, result.name)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault()
                      focusResult(index + 1)
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault()
                      if (index === 0) {
                        document.querySelector<HTMLInputElement>('#emoji-query')?.focus()
                      } else {
                        focusResult(index - 1)
                      }
                    }
                  }}
                >
                  <span className="emoji" aria-hidden="true">{result.emoji}</span>
                  <span className="result-copy">
                    <strong>{result.name}</strong>
                    <span>{result.keywords.join(' · ')}</span>
                  </span>
                  <span className="copy-hint" aria-hidden="true">Copy</span>
                  <span className="visually-hidden">Copy {result.name} emoji</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {manualCopy ? (
        <div className="manual-copy">
          <label htmlFor="manual-copy">Manual copy</label>
          <input
            id="manual-copy"
            value={manualCopy}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      ) : null}

      <p className="status" aria-live="polite" aria-atomic="true">{status}</p>

      <footer>
        <a href="https://fetchmoji.com" target="_blank" rel="noreferrer">
          Open full FetchMoji
        </a>
        <span>Queries stay on this device.</span>
      </footer>
    </main>
  )
}

export default App
