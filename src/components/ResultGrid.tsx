import { parseEmojiResult } from '../utils/emojiResult'
import { EmojiButton } from './EmojiButton'

export function emojiResultId(index: number): string {
  return `emoji-result-${index}`
}

export function ResultGrid(props: {
  results: string[]
  onCopy: (x: { char: string; name: string }) => void
  onMenu: (x: { char: string; name: string }) => void
  selectedIndex?: number | null
  onActiveIndexChange?: (index: number) => void
}) {
  const {
    results,
    onCopy,
    onMenu,
    selectedIndex,
    onActiveIndexChange,
  } = props

  return (
    <ul
      id="emoji-results"
      className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))]
      gap-3"
    >
      {results.map((row, index) => {
        const { char, name } = parseEmojiResult(row)

        return (
          <li
            key={row}
            className="list-none"
          >
            <EmojiButton
              id={emojiResultId(index)}
              emoji={{ char, name }}
              isActive={selectedIndex === index}
              onCopy={onCopy}
              onMenu={onMenu}
              onPointerEnter={() =>
                onActiveIndexChange?.(index)}
            />
          </li>
        )
      })}
    </ul>
  )
}
