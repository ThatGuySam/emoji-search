export async function copyEmojiToClipboard(
  char: string,
) {
  try {
    await navigator.clipboard.writeText(char)
  } catch {}

  if (navigator.vibrate) {
    navigator.vibrate(10)
  }
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
