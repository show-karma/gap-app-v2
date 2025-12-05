export const reduceText = (text: string | undefined, words = 20) => {
  if (!text) return "";
  const splittedText = text.split(" ");
  const reduced = splittedText.slice(0, words).join(" ");
  return reduced;
};
