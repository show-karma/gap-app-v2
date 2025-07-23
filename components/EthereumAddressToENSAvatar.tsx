/* eslint-disable @next/next/no-img-element */
"use client";
import { blo } from "blo";
import type React from "react";
import { useEffect } from "react";
import { useENS } from "@/store/ens";
import { cn } from "@/utilities/tailwind";

interface Props {
	address: any;
	className?: string;
}

const EthereumAddressToENSAvatar: React.FC<Props> = ({
	address,
	className,
}) => {
	const ensAvatars = useENS((state) => state.ensData);
	const populateEns = useENS((state) => state.populateEns);
	const lowerCasedAddress = address.toLowerCase();

	useEffect(() => {
		if (!ensAvatars[lowerCasedAddress]) {
			populateEns([lowerCasedAddress]);
		}
	}, [lowerCasedAddress, ensAvatars, populateEns]);

	return (
		<div>
			<img
				src={
					!ensAvatars[lowerCasedAddress]?.avatar
						? blo(lowerCasedAddress)
						: (ensAvatars[lowerCasedAddress].avatar as string)
				}
				className={cn(
					"h-6 w-6 min-h-6 min-w-6 items-center rounded-full border-1 border-gray-100 dark:border-zinc-900",
					className,
				)}
				alt="Recipient's Profile Picture"
			/>
		</div>
	);
};

export default EthereumAddressToENSAvatar;
