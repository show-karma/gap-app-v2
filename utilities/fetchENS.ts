import { createPublicClient, type Hex, http, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { errorManager } from "@/components/Utilities/errorManager";
import { envVars } from "@/utilities/enviromentVars";

const ENS_BATCH_SIZE = 10;

if (!envVars.RPC.MAINNET) {
  console.warn(
    "NEXT_PUBLIC_RPC_MAINNET is not set; ENS resolution will use the default public RPC"
  );
}

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(envVars.RPC.MAINNET, {
    batch: true,
    retryCount: 1,
  }),
  cacheTime: 10 * 60 * 1000,
});

// In-flight request deduplication
const pendingNameRequests = new Map<string, Promise<string | null>>();
const pendingAvatarRequests = new Map<string, Promise<string | null>>();

async function resolveEnsName(address: Hex): Promise<string | null> {
  const key = address.toLowerCase();
  const pending = pendingNameRequests.get(key);
  if (pending) return pending;

  const promise = ensClient
    .getEnsName({ address })
    .catch((error) => {
      errorManager("ENS name resolution failed", error, { address });
      return null;
    })
    .finally(() => {
      pendingNameRequests.delete(key);
    });

  pendingNameRequests.set(key, promise);
  return promise;
}

async function resolveEnsAvatar(name: string): Promise<string | null> {
  const pending = pendingAvatarRequests.get(name);
  if (pending) return pending;

  const promise = ensClient
    .getEnsAvatar({ name: normalize(name) })
    .catch((error) => {
      errorManager("ENS avatar resolution failed", error, { name });
      return null;
    })
    .finally(() => {
      pendingAvatarRequests.delete(name);
    });

  pendingAvatarRequests.set(name, promise);
  return promise;
}

async function resolveSingle(address: Hex) {
  const name = await resolveEnsName(address);
  if (!name) return { name: undefined, address, avatar: undefined };

  const avatar = await resolveEnsAvatar(name);
  return { name, address, avatar };
}

async function processBatch(addresses: Hex[]) {
  return Promise.all(addresses.map(resolveSingle));
}

function toHex(address: string): Hex | null {
  const normalized = address.startsWith("0x") ? address : `0x${address}`;
  return isAddress(normalized) ? (normalized as Hex) : null;
}

export const fetchENS = async (addresses: (Hex | string)[]) => {
  try {
    const validAddresses = addresses
      .map((addr) => toHex(addr as string))
      .filter((addr): addr is Hex => addr !== null);

    const results: {
      name?: string;
      address: Hex | string;
      avatar?: string | null;
    }[] = [];

    for (let i = 0; i < validAddresses.length; i += ENS_BATCH_SIZE) {
      const batch = validAddresses.slice(i, i + ENS_BATCH_SIZE);
      const batchResults = await processBatch(batch);
      results.push(...batchResults);
    }

    return results;
  } catch (error: any) {
    errorManager("Error in fetch ens names", error, { addresses });
    return addresses.map((address) => ({
      name: undefined,
      address,
      avatar: undefined,
    }));
  }
};

export const fetchAddressFromENS = async (ensNames: string[]) => {
  try {
    const results: { name: string; address?: string }[] = [];

    for (let i = 0; i < ensNames.length; i += ENS_BATCH_SIZE) {
      const batch = ensNames.slice(i, i + ENS_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (name) => {
          try {
            const address = await ensClient.getEnsAddress({
              name: normalize(name),
            });
            return { name, address: address || undefined };
          } catch (error) {
            errorManager("ENS address resolution failed", error, { name });
            return { name, address: undefined };
          }
        })
      );
      results.push(...batchResults);
    }

    return results;
  } catch (error: any) {
    errorManager("Error in fetch addresses from ENS names", error, {
      ensNames,
    });
    return ensNames.map((name) => ({
      name,
      address: undefined,
    }));
  }
};
