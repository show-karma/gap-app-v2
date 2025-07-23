"use client";
import { XMarkIcon } from "@heroicons/react/24/solid";
import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useWallet } from "@/hooks/useWallet";
import { useProjectStore } from "@/store";
import { useGrantStore } from "@/store/grant";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";

export const GrantCompletion: FC = () => {
	const { grant } = useGrantStore();
	const { project } = useProjectStore();
	const [description, setDescription] = useState("");

	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const { chain, address } = useAccount();
	const { switchChainAsync } = useWallet();
	const refreshProject = useProjectStore((state) => state.refreshProject);

	const { changeStepperStep, setIsStepper } = useStepper();
	const { gap } = useGap();

	const markGrantAsComplete = async (
		grantToComplete: IGrantResponse,
		data: {
			text?: string;
			title?: string;
		},
	) => {
		let gapClient = gap;
		try {
			if (
				!checkNetworkIsValid(chain?.id) ||
				chain?.id !== grantToComplete.chainID
			) {
				await switchChainAsync?.({ chainId: grantToComplete.chainID });
				gapClient = getGapClient(grantToComplete.chainID);
			}

			const { walletClient, error } = await safeGetWalletClient(
				grantToComplete.chainID,
			);

			if (error || !walletClient || !gapClient) {
				throw new Error("Failed to connect to wallet", { cause: error });
			}
			const walletSigner = await walletClientToSigner(walletClient);
			const fetchedProject = await gapClient.fetch.projectById(project?.uid);
			if (!fetchedProject) return;
			const grantInstance = fetchedProject.grants.find(
				(g) => g.uid.toLowerCase() === grantToComplete.uid.toLowerCase(),
			);
			if (!grantInstance) return;
			const sanitizedGrantComplete = sanitizeObject({
				title: data.title || "",
				text: data.text || "",
			});
			await grantInstance
				.complete(walletSigner, sanitizedGrantComplete, changeStepperStep)
				.then(async (res) => {
					let retries = 1000;
					changeStepperStep("indexing");
					let fetchedProject = null;
					const txHash = res?.tx[0]?.hash;
					if (txHash) {
						await fetchData(
							INDEXER.ATTESTATION_LISTENER(txHash, grant?.chainID as number),
							"POST",
							{},
						);
					}
					while (retries > 0) {
						fetchedProject = await gapClient!.fetch
							.projectById(project?.uid as Hex)
							.catch(() => null);
						const grant = fetchedProject?.grants?.find(
							(g) => g.uid === grantToComplete.uid,
						);
						if (grant && grant.completed) {
							retries = 0;
							changeStepperStep("indexed");
							toast.success(MESSAGES.GRANT.MARK_AS_COMPLETE.SUCCESS);
							await refreshProject().then(() => {
								router.push(
									PAGES.PROJECT.GRANT(
										project?.details?.data.slug || (project?.uid as Hex),
										grant?.uid as Hex,
									),
								);
								router.refresh();
							});
						}
					}
					retries -= 1;
					// eslint-disable-next-line no-await-in-loop, no-promise-executor-return
					await new Promise((resolve) => setTimeout(resolve, 1500));
				});
		} catch (error: any) {
			errorManager(
				MESSAGES.GRANT.MARK_AS_COMPLETE.ERROR,
				error,
				{ grantUID: grant?.uid, address },
				{ error: MESSAGES.GRANT.MARK_AS_COMPLETE.ERROR },
			);
		} finally {
			setIsStepper(false);
		}
	};

	const onSubmit = async () => {
		setIsLoading(true);
		await markGrantAsComplete(grant as IGrantResponse, {
			text: description,
		}).finally(() => {
			setIsLoading(false);
		});
	};

	return (
		<div className="mt-9 flex flex-1">
			<div className="flex w-full max-w-3xl flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-800 px-4 py-6 max-lg:max-w-full">
				<div className="flex w-full flex-row justify-between">
					<h4 className="text-2xl font-bold text-black dark:text-zinc-100">
						Grant completion summary
					</h4>
					<Link
						href={PAGES.PROJECT.GRANT(
							project?.details?.data.slug || (project?.uid as Hex),
							grant?.uid as Hex,
						)}
						className="bg-transparent p-4 hover:bg-transparent hover:opacity-75"
					>
						<XMarkIcon className="h-6 w-6 " />
					</Link>
				</div>
				<div className="flex w-full flex-col gap-4">
					<div className="flex w-full flex-col gap-2">
						<label htmlFor="completion-description" className={labelStyle}>
							Description (optional)
						</label>
						<div className="w-full bg-transparent" data-color-mode="light">
							<MarkdownEditor
								value={description}
								onChange={(newValue: string) => setDescription(newValue || "")}
								placeholderText="Summarize your grant work, your experience working on the grant and the potential impact it will have."
							/>
						</div>
					</div>
					<div className="flex w-full flex-row-reverse">
						<Button
							onClick={() => onSubmit()}
							className="flex w-max flex-row bg-[#17B26A] text-white hover:bg-[#17B26A]"
							disabled={isLoading}
							isLoading={isLoading}
						>
							Mark grant as complete
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
