import { createPublicClient, type Hex, http } from "viem";
import { mainnet } from "viem/chains";
import { errorManager } from "@/components/Utilities/errorManager";
import { retry } from "./retries";

export const fetchENS = async (addresses: (Hex | string)[]) => {
  const alchemyTransport = http(
    `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`,
    {
      batch: true,
    }
  );

  const client = createPublicClient({
    chain: mainnet,
    transport: alchemyTransport,
  });

  try {
    const calls = addresses.map(async (address) => {
      const name = await retry(
        async () => await client.getEnsName({ address: address as Hex }),
        3, // maxRetries
        1000, // initialDelay
        5000, // maxDelay
        2 // backoff factor
      );
      if (!name) return { name: undefined, address };
      const avatar = await retry(
        async () => await client.getEnsAvatar({ name }),
        5, // maxRetries
        1000, // initialDelay
        5000, // maxDelay
        1 // backoff factor
      );
      return {
        name,
        address,
        avatar,
      };
    });
    const names = await Promise.all(calls);
    return names;
  } catch (error: any) {
    errorManager(`Error in fetch ens names`, error, {
      addresses,
    });
    return addresses.map((address) => ({
      name: undefined,
      address,
      avatar: undefined,
    }));
  }
};

/**
 * Fetches Ethereum addresses from ENS names
 * @param ensNames Array of ENS names to resolve
 * @returns Array of objects containing the ENS name and its corresponding address
 */
export const fetchAddressFromENS = async (ensNames: string[]) => {
  const alchemyTransport = http(
    `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`,
    {
      batch: true,
    }
  );

  const client = createPublicClient({
    chain: mainnet,
    transport: alchemyTransport,
  });

  try {
    const calls = ensNames.map(async (name) => {
      const address = await retry(
        async () => await client.getEnsAddress({ name }),
        3, // maxRetries
        1000, // initialDelay
        5000, // maxDelay
        2 // backoff factor
      );

      return {
        name,
        address: address || undefined,
      };
    });

    const addresses = await Promise.all(calls);
    return addresses;
  } catch (error: any) {
    errorManager(`Error in fetch addresses from ENS names`, error, {
      ensNames,
    });
    return ensNames.map((name) => ({
      name,
      address: undefined,
    }));
  }
};
