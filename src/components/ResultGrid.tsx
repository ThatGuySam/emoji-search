import { parseEmojiResult } from '../utils/emojiResult'

export function ResultGrid(props: {
  results: string[]
  onCopy: (x: { char: string; name: string }) => void
  onMenu: (x: { char: string; name: string }) => void
}) {
  const { results, onCopy, onMenu } = props

  return (
    <ul
      className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))]
      gap-3"
    >
      {results.map((row) => {
        const { char, name } = parseEmojiResult(row)

        return (
          <li
            key={row}
            className="list-none"
          >
            <button
              type="button"
              aria-label={`Copy ${name} emoji`}
              className="flex w-full items-center justify-center gap-1
              min-h-11 min-w-11 p-2 rounded-2xl border bg-secondary
              shadow-sm hover:shadow transition active:scale-95"
              onClick={() => onCopy({
                char,
                name,
              })}
              onContextMenu={(e) => {
                e.preventDefault()
                onMenu({ char, name })
              }}
            >
              <span
                role="img"
                aria-label={name}
                className="text-[clamp(22px,4.6vh,32px)] leading-none"
              >
                {char}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
