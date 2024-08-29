export const addPrefixToIPFSLink = (link: string) => {
  if (link.startsWith("ipfs://")) {
    return link.replace("ipfs://", "https://ipfs.io/ipfs/");
  } else {
    return link;
  }
};
