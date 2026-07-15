export async function copyEmojiToClipboard(
  char: string,
): Promise<boolean> {
  let copied = false

  try {
    await navigator.clipboard.writeText(char)
    copied = true
  } catch {}

  if (navigator.vibrate) {
    navigator.vibrate(10)
  }

  return copied
}

export function buildEmojiCopyMessage(
  options: {
    char: string
    name: string
  },
) {
  const { char, name } = options
  return `Copied ${name} ${char}`
}
