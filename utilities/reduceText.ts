export const reduceText = (text: string, words = 20) => {
  const splittedText = text.split(" ")
  const reduced = splittedText.slice(0, words).join(" ")
  return reduced
}
