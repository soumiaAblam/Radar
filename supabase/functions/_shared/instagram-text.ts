// Recorre puntos de código completos para no dividir emojis al recortar títulos.
// PostgreSQL no admite sustitutos Unicode aislados ni caracteres nulos.
export function sanitizeInstagramText(value: string): string {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0)
    return character.length === 1 && (code === 0 || (code >= 0xd800 && code <= 0xdfff))
      ? '\ufffd'
      : character
  }).join('')
}

export function instagramTitle(caption: string | undefined): string {
  const firstLine = sanitizeInstagramText(caption ?? '').split('\n')[0]
  return Array.from(firstLine).slice(0, 100).join('') || 'Publicación de Instagram'
}
