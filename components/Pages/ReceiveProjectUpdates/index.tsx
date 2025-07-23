"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useState, useTransition } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { errorManager } from "@/components/Utilities/errorManager";
import { Spinner } from "@/components/Utilities/Spinner";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

const lookupSchema = z.object({
	address: z.string().refine((str) => isAddress(str), {
		message: "This address is not valid",
	}),
});
const subscribeSchema = z.object({
	email: z.string().email(),
});

type LookupFormType = z.infer<typeof lookupSchema>;
type SubscribeFormType = z.infer<typeof subscribeSchema>;

interface SubscribeFormProps {
	address: string;
	changeIsSubscribed: (value: boolean) => void;
}

const SubscribeForm = ({ address, changeIsSubscribed }: SubscribeFormProps) => {
	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors, isValid },
	} = useForm<SubscribeFormType>({
		resolver: zodResolver(subscribeSchema),
		reValidateMode: "onChange",
		mode: "onChange",
	});
	const [isLoading, setIsLoading] = useState(false);

	const onSubmit: SubmitHandler<SubscribeFormType> = async (data) => {
		setIsLoading(true);
		try {
			const [res, error] = await fetchData(
				INDEXER.COMMUNITY.SUBSCRIBE.BULK,
				"POST",
				{
					publicAddress: address.toLowerCase(),
					email: data.email,
				},
			);
			if (error) {
				throw error;
			}
			changeIsSubscribed(true);
			toast.success(
				"You have subscribed to all the projects funded by your wallet",
			);
		} catch (error: any) {
			console.error(error);
			errorManager(
				`Error of user ${address}/${data.email} subscribing to all projects funded by his wallet`,
				error,
				{
					address,
					email: data.email,
				},
			);
			toast.error("An error occurred while subscribing, try again later.");
			changeIsSubscribed(false);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-8">
			<form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
				<div className="flex flex-col gap-2 w-full">
					<input
						className="rounded w-full text-black dark:text-white dark:bg-zinc-700 placeholder:text-zinc-500 dark:placeholder:text-zinc-100"
						placeholder="Enter your e-mail address"
						{...register("email")}
					/>
					<p className="text-red-400">{errors.email?.message}</p>
				</div>
				<Button
					type="submit"
					className="w-full flex flex-row text-base justify-center items-center bg-[#0E101B] hover:bg-[#0E101B]/80 text-white px-4 py-2 rounded"
					isLoading={isLoading}
					disabled={isLoading || !isValid}
				>
					Subscribe to get updates
				</Button>
			</form>
		</div>
	);
};

interface StepNavigatorProps {
	step: "lookup" | "subscribe";
	setStep: (step: "lookup" | "subscribe") => void;
}

export const ReceiveProjectUpdates = ({
	communityName,
}: {
	communityName: string;
}) => {
	const {
		register,
		handleSubmit,
		formState: { errors, isValid },
		setError,
	} = useForm<LookupFormType>({
		resolver: zodResolver(lookupSchema),
		reValidateMode: "onChange",
		mode: "onChange",
	});
	const [isLoading, setIsLoading] = useState(false);
	const [projectsFunded, setProjectsFunded] = useState(0);
	const [addressSearched, setAddressSearched] = useState<string | null>(null);
	const [subscribed, setSubscribed] = useState(false);
	const [step, setStep] = useState<"lookup" | "subscribe">("lookup");

	const changeIsSubscribed = (value: boolean) => {
		setSubscribed(value);
	};

	const onSubmit: SubmitHandler<LookupFormType> = async (data) => {
		setAddressSearched(data.address);
		setIsLoading(true);
		changeIsSubscribed(false);
		try {
			const [res, error] = await fetchData(
				INDEXER.PROJECT.FUNDEDBY(data.address.toLowerCase()),
			);
			if (error) {
				throw error;
			}
			if (res.length > 0) {
				setProjectsFunded(res.length);
				setStep("subscribe");
			} else {
				setError("address", {
					message: "No projects funded by this wallet",
				});
				setStep("lookup");
			}
		} catch (error: any) {
			console.error(error);
			setProjectsFunded(0);
			setStep("lookup");
		} finally {
			setIsLoading(false);
		}
	};
	return (
		<div className="flex flex-col gap-4  max-w-xl w-full bg-[#EEF4FF] dark:bg-zinc-800 p-5 rounded-lg max-lg:max-w-full">
			{step === "lookup" ? (
				<div className="flex flex-col gap-4">
					<div className="flex flex-row gap-2 items-start">
						<Image
							src="/icons/mail.png"
							width={24}
							height={24}
							alt="Mail"
							className="w-6 h-6"
						/>
						<p className="text-brand-darkblue text-sm font-semibold dark:text-zinc-300">
							Receive updates from your funded projects
						</p>
					</div>

					<div className="flex flex-col gap-3">
						<p className="text-brand-darkblue text-base font-semibold dark:text-zinc-300 max-lg:text-sm max-lg:mt-2">
							Enter the wallet you’ve used to fund projects on {communityName}{" "}
							to track them.
						</p>
						<form
							className="flex flex-col gap-4"
							onSubmit={handleSubmit(onSubmit)}
						>
							<div className="flex flex-col gap-2">
								<input
									className="rounded text-black dark:text-white dark:bg-zinc-700 placeholder:text-zinc-500 dark:placeholder:text-zinc-100 border-black border"
									placeholder="Enter your wallet address"
									{...register("address")}
								/>
								<p className="text-red-400">{errors.address?.message}</p>
							</div>
							<Button
								disabled={isLoading || !isValid}
								type="submit"
								className="w-full flex flex-row text-base justify-center items-center bg-[#0E101B] hover:bg-[#0E101B]/80 text-white px-4 py-2 rounded"
								isLoading={isLoading}
							>
								Lookup Projects
							</Button>
						</form>
					</div>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					<Image
						src="/icons/congratulations.png"
						width={24}
						height={24}
						alt="Congratulations"
					/>
					<p className="text-brand-darkblue dark:text-white font-semibold text-base">
						You’ve funded {projectsFunded} projects. You can see the full list{" "}
						<ExternalLink
							className="underline text-blue-600 dark:text-blue-400"
							href={`https://explorer.gitcoin.co/#/contributors/${addressSearched}`}
						>
							here.
						</ExternalLink>
					</p>
					{projectsFunded > 0 ? (
						subscribed ? (
							<p className="text-green-600 dark:text-green-500">
								Successfully subscribed to all the projects funded by your
								wallet.
							</p>
						) : (
							<SubscribeForm
								address={addressSearched as string}
								changeIsSubscribed={changeIsSubscribed}
							/>
						)
					) : null}
				</div>
			)}
			<div className="flex flex-row gap-2 w-full justify-center items-center">
				<Button
					className="w-3 h-3 rounded-full p-0"
					onClick={() => setStep("lookup")}
					style={{
						backgroundColor: step === "lookup" ? "#155EEF" : "transparent",
						border:
							step === "lookup" ? "2px solid transparent" : "2px solid #155EEF",
					}}
				/>
				<Button
					className="w-3 h-3 rounded-full p-0"
					onClick={() => setStep("subscribe")}
					disabled={!(projectsFunded > 0)}
					style={{
						backgroundColor: step === "subscribe" ? "#155EEF" : "transparent",
						border:
							step === "subscribe"
								? "2px solid transparent"
								: "2px solid #155EEF",
					}}
				/>
			</div>
		</div>
	);
};
