import { parseEmojiResult } from '../utils/emojiResult'
import { EmojiButton } from './EmojiButton'

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
            <EmojiButton
              emoji={{ char, name }}
              onCopy={onCopy}
              onMenu={onMenu}
            />
          </li>
        )
      })}
    </ul>
  )
}
