export const shareOnX = (shareText: string) => {
  const twitterURL = `https://x.com/intent/post?text=`
  const shareURI = twitterURL + encodeURIComponent(shareText)
  return shareURI
}
