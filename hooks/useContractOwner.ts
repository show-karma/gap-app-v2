import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Chain } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuthStore } from "@/store/auth";
import { useOwnerStore } from "@/store/owner";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { getContractOwner } from "@/utilities/sdk/getContractOwner";

const fetchContractOwner = async (
	signer: any,
	chain: Chain,
	address: string,
): Promise<boolean> => {
	if (!signer || !chain || !address) return false;

	const owner = await getContractOwner(signer, chain);
	return owner?.toLowerCase() === address?.toLowerCase();
};

export const useContractOwner = (address?: string, chain?: Chain) => {
	const { isAuth } = useAuthStore();
	const { setIsOwner, setIsOwnerLoading } = useOwnerStore();
	const signer = useSigner();

	const queryResult = useQuery<boolean, Error>({
		queryKey: ["contract-owner", address, chain?.id],
		queryFn: () => fetchContractOwner(signer, chain!, address!),
		enabled: !!signer && !!address && !!chain && isAuth,
		staleTime: 10 * 60 * 1000, // 10 minutes - contract owner changes rarely
		retry: (failureCount, error) => {
			// Retry up to 2 times for network errors
			return failureCount < 2;
		},
	});

	const { data, isLoading, error, refetch } = queryResult;

	// Sync with Zustand store
	useEffect(() => {
		setIsOwnerLoading(isLoading);
	}, [isLoading, setIsOwnerLoading]);

	useEffect(() => {
		if (typeof data === "boolean") {
			setIsOwner(data);
		} else if (!signer || !address || !isAuth) {
			setIsOwner(false);
		}
	}, [data, signer, address, isAuth, setIsOwner]);

	useEffect(() => {
		if (error) {
			errorManager(`Error fetching contract owner for ${address}`, error, {
				signer,
				address,
				chain,
			});
			setIsOwner(false);
		}
	}, [error, address, signer, chain, setIsOwner]);

	return {
		...queryResult,
		refetch,
	};
};
