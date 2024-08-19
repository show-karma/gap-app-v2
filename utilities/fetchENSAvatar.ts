import { createPublicClient, type Hex, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

export const fetchENSAvatars = async (addresses: (Hex | string)[]) => {
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
      const avatar =
        (await client.getEnsAvatar({ name: normalize(name as string) })) ||
        null;
      return {
        name,
        avatar,
        address,
      };
    });
    const avatars = await Promise.all(calls);
    return avatars;
  } catch (error) {
    console.log(error);
    return addresses.map((address) => ({
      name: undefined,
      avatar: undefined,
      address,
    }));
  }
};
