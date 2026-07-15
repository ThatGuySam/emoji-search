import { useId } from 'react'

import type { RecentEmoji } from '@/lib/recentEmojis'

import { EmojiButton } from './EmojiButton'

export function RecentEmojiSection(props: {
  emojis: RecentEmoji[]
  onCopy: (emoji: RecentEmoji) => void
  onMenu: (emoji: RecentEmoji) => void
}) {
  const { emojis, onCopy, onMenu } = props
  const headingId = useId()

  if (emojis.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby={headingId}
      className="mb-4"
    >
      <h2
        id={headingId}
        className="mb-2 text-sm font-medium text-muted-foreground"
      >
        Recently used
      </h2>
      <ul
        aria-labelledby={headingId}
        className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-3"
      >
        {emojis.map((emoji) => (
          <li
            key={emoji.char}
            className="list-none"
          >
            <EmojiButton
              emoji={emoji}
              onCopy={onCopy}
              onMenu={onMenu}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
