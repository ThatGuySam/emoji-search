type EmojiButtonValue = {
  char: string
  name: string
}

export function EmojiButton(props: {
  emoji: EmojiButtonValue
  onCopy: (emoji: EmojiButtonValue) => void
  onMenu: (emoji: EmojiButtonValue) => void
}) {
  const { emoji, onCopy, onMenu } = props
  const { char, name } = emoji

  return (
    <button
      type="button"
      aria-label={`Copy ${name} emoji`}
      className="flex w-full items-center justify-center gap-1
      min-h-11 min-w-11 p-2 rounded-2xl border bg-secondary
      shadow-sm hover:shadow
      transition-[transform,box-shadow] duration-150
      ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
      onClick={() => onCopy(emoji)}
      onContextMenu={(event) => {
        event.preventDefault()
        onMenu(emoji)
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
  )
}
