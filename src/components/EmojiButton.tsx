type EmojiButtonValue = {
  char: string
  name: string
}

export function EmojiButton(props: {
  id?: string
  emoji: EmojiButtonValue
  isActive?: boolean
  onCopy: (emoji: EmojiButtonValue) => void
  onMenu: (emoji: EmojiButtonValue) => void
  onPointerEnter?: () => void
}) {
  const {
    id,
    emoji,
    isActive = false,
    onCopy,
    onMenu,
    onPointerEnter,
  } = props
  const { char, name } = emoji

  return (
    <button
      id={id}
      type="button"
      aria-label={`Copy ${name} emoji`}
      data-active={isActive || undefined}
      data-emoji-result=""
      className="flex w-full items-center justify-center gap-1
      min-h-11 min-w-11 p-2 rounded-2xl border bg-secondary
      shadow-sm hover:shadow
      transition-[transform,box-shadow] duration-150
      ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]
      data-[active=true]:ring-2 data-[active=true]:ring-ring"
      onClick={() => onCopy(emoji)}
      onPointerEnter={onPointerEnter}
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
