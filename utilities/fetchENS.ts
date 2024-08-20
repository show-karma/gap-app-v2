import { errorManager } from "@/components/Utilities/errorManager";
import { createPublicClient, type Hex, http } from "viem";
import { mainnet } from "viem/chains";

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
      const name =
        (await client.getEnsName({ address: address as Hex })) || null;
      if (!name) return { name: undefined, address };
      const avatar = (await client.getEnsAvatar({ name })) || null;
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
    console.log(error);
    return addresses.map((address) => ({
      name: undefined,
      address,
      avatar: undefined,
    }));
  }
};
