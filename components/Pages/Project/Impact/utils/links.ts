import { urlRegex } from "@/utilities/regexs/urlRegex";

// Map network to block explorer URL
const explorerUrls: Record<string, string> = {
  ethereum: "https://etherscan.io",
  polygon: "https://polygonscan.com",
  optimism: "https://optimistic.etherscan.io",
  arbitrum: "https://arbiscan.io",
  celo: "https://celoscan.io",
  base: "https://basescan.org",
  avalanche: "https://snowtrace.io",
  bsc: "https://bscscan.com",
  gnosis: "https://gnosisscan.io",
  fantom: "https://ftmscan.com",
  zksync: "https://explorer.zksync.io",
  sei: "https://www.seiscan.app/pacific-1/contracts",
};
const networkNames: Record<string, string> = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  optimism: "Optimism",
  arbitrum: "Arbitrum",
  celo: "Celo",
  base: "Base",
  avalanche: "Avalanche",
  bsc: "BSC",
  gnosis: "Gnosis",
  fantom: "Fantom",
  zksync: "ZKsync",
  sei: "Sei",
};

export const linkFormatter = (link: string) => {
  if (link.includes("github.com")) {
    const githubFromField = link.includes("http") ? link : `https://${link}`;
    const repoUrl = new URL(githubFromField);
    const pathParts = repoUrl.pathname.split("/").filter(Boolean);
    if (repoUrl.hostname.includes("github.com") && pathParts.length >= 2) {
      const owner = pathParts[0];
      const repoName = pathParts[1];
      return `https://github.com/${owner}/${repoName}`;
    }
  }
  return link;
};

export const linkName = (link: string) => {
  if (link.includes("github.com")) {
    return "Github Repo";
  }

  // Check if it's an explorer URL
  try {
    const url = new URL(link);
    const hostname = url.hostname.toLowerCase();

    // Find matching network by explorer URL
    const network = Object.entries(explorerUrls).find(([_, explorerUrl]) =>
      explorerUrl.toLowerCase().includes(hostname)
    )?.[0];

    if (network && networkNames[network]) {
      return `${networkNames[network]} Contract`;
    }
  } catch (error) {
    // If URL parsing fails, return original link
    return link;
  }

  return link;
};

// Helper function to check if a URL is an Etherscan API v2 link
const isEtherscanApiLink = (url: string): boolean => {
  try {
    // Check for the specific Etherscan v2 API URL
    return url.includes('api.etherscan.io/v2/api');
  } catch {
    return false;
  }
};

// Helper function to check if a URL is a Dune link (legacy)
const isDuneLink = (url: string): boolean => {
  try {
    return url.includes('dune.com');
  } catch {
    return false;
  }
};

export const mapLinks = (linksToMap: string[], networkAddresses?: string[]) => {
  // Check if there's an Etherscan API link or legacy Dune link in the proofs
  const hasEtherscanApiLink = linksToMap.some((link) => isEtherscanApiLink(link));
  const hasDuneLink = linksToMap.some((link) => isDuneLink(link));

  // Filter out Etherscan API links and Dune links from the displayed links
  const linksMap = linksToMap
    .map((datapoint) =>
      urlRegex.test(datapoint) ? linkFormatter(datapoint) : null
    )
    .filter(Boolean)
    .filter((link) => 
      !isEtherscanApiLink(link as string) && 
      !isDuneLink(link as string)
    ); // Don't show API links or Dune links

  // Get contract URLs from network addresses when Etherscan API link or Dune link is present
  let contractUrls: string[] = [];
  if (networkAddresses && (hasEtherscanApiLink || hasDuneLink)) {
    contractUrls = networkAddresses.map((address) => {
      const addressParts = address.split(":");
      const chain = addressParts[0];
      const parsedAddress = addressParts[1];
      const explorerUrl = explorerUrls[chain];
      if (!explorerUrl) return "";
      return `${explorerUrl}/address/${parsedAddress.trim()}`;
    });
    contractUrls = contractUrls.filter(Boolean);
  }

  const linksSet = new Set([...linksMap, ...contractUrls]);

  const links = Array.from(linksSet);
  return links;
};
