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
  if (link.includes("dune.com")) {
    return "Dune Query";
  }
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
  }

  return link;
};

export const mapLinks = (linksToMap: string[]) => {
  const linksMap = linksToMap
    .map((datapoint) =>
      urlRegex.test(datapoint) ? linkFormatter(datapoint) : null
    )
    .filter(Boolean);

  // Get contract URLs for any Dune links
  const contractUrls = linksMap
    .filter((link) => link && link.includes("dune.com"))
    .flatMap((link) => getContractUrl(link as string));

  const linksSet = new Set([...linksMap, ...contractUrls]);

  const links = Array.from(linksSet);
  return links;
};

export const getContractUrl = (link: string) => {
  if (!link || !link.includes("dune.com")) return [];

  try {
    const url = new URL(link);
    const params = new URLSearchParams(url.search);

    // Extract contract addresses
    const contractAddressesParam = params.get("contract_addresses");
    if (!contractAddressesParam) return [];

    // Get all contract addresses
    const contractAddresses = contractAddressesParam
      .split(",")
      .map((addr) => addr.trim());

    // Extract networks
    const networkParam = params.get("network");
    if (!networkParam) return [];

    // Parse all networks from format like "'celo','ethereum'"
    const networks = networkParam
      .replace(/'/g, "")
      .split(",")
      .map((net) => net.trim());

    // Generate URLs for all combinations of contract addresses and networks
    const urls: string[] = [];
    for (const network of networks) {
      const explorerUrl = explorerUrls[network];
      if (!explorerUrl) continue;

      for (const contractAddress of contractAddresses) {
        urls.push(`${explorerUrl}/address/${contractAddress}`);
      }
    }

    return urls;
  } catch (error) {
    console.error("Error parsing Dune URL:", error);
    return [];
  }
};
