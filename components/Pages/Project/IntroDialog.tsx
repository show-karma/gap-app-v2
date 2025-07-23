"use client";
import { Dialog, Transition } from "@headlessui/react";
import { zodResolver } from "@hookform/resolvers/zod";
/* eslint-disable @next/next/no-img-element */
import { type FC, Fragment, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useContactInfo } from "@/hooks/useContactInfo";
import { useGap } from "@/hooks/useGap";
import { useProjectStore } from "@/store";
import { useIntroModalStore } from "@/store/modals/intro";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { shortAddress } from "@/utilities/shortAddress";

type IntroDialogProps = {};

const schema = z.object({
	email: z.string().email({ message: MESSAGES.PROJECT.INTRO.EMAIL }).min(3, {
		message: MESSAGES.PROJECT.INTRO.EMAIL,
	}),
	telegram: z.string(),
	message: z
		.string()
		.describe(MESSAGES.PROJECT.INTRO.MESSAGE)
		.min(3, MESSAGES.PROJECT.INTRO.MESSAGE),
});

type SchemaType = z.infer<typeof schema>;

const inputStyle =
	"bg-gray-100 border border-gray-400 rounded-md p-2 dark:bg-zinc-900";
const labelStyle =
	"text-slate-700 text-sm font-bold leading-tight dark:text-slate-200";

export const IntroDialog: FC<IntroDialogProps> = () => {
	const [isLoading, setIsLoading] = useState(false);
	const { address } = useAccount();

	const { isIntroModalOpen: isOpen, setIsIntroModalOpen: setIsOpen } =
		useIntroModalStore();

	const project = useProjectStore((state) => state.project);
	const { data: contactsInfo } = useContactInfo(project?.uid);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SchemaType>({
		resolver: zodResolver(schema),
		mode: "onChange",
	});

	function closeModal() {
		setIsOpen(false);
	}

	const handleFunction = async (data: SchemaType) => {
		setIsLoading(true);
		try {
			if ((contactsInfo?.length as number) < 1) {
				toast.error("No contact info found");
				return;
			}

			if (!project || !data.email || !data.message) return;

			const [response, error] = await fetchData(
				INDEXER.PROJECT.REQUEST_INTRO(project.details?.data.slug as string),
				"POST",
				{
					email: data.email,
					telegram: data.telegram,
					message: data.message,
				},
				{},
				{},
				false,
			);
			if (!response || error) {
				toast.error(`Error requesting intro: ${error}`);
			}
			closeModal();
			toast.success("Successfully requested intro!");
		} catch (error: any) {
			errorManager(
				MESSAGES.REQUEST_INTRO.ERROR,
				error,
				{
					projectUID: project?.uid,
					address,
				},
				{ error: MESSAGES.REQUEST_INTRO.ERROR },
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog as="div" className="relative z-10" onClose={closeModal}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/25" />
				</Transition.Child>

				<div className="fixed inset-0 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4 text-center">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
								<Dialog.Title
									as="h3"
									className="text-xl font-normal leading-6 text-gray-900 dark:text-zinc-100"
								>
									Request Intro to{" "}
									<b>
										{project?.details?.data?.title ||
											(project?.uid
												? shortAddress(project?.uid as string)
												: "this project")}{" "}
									</b>
									team
								</Dialog.Title>
								<form onSubmit={handleSubmit(handleFunction)}>
									<div className="w-full px-2 py-4 sm:px-0">
										<div className="flex w-full flex-col gap-2">
											<label htmlFor="email-input" className={labelStyle}>
												Email *
											</label>
											<input
												id="email-input"
												type="text"
												className={inputStyle}
												placeholder="Enter your email address"
												{...register("email")}
											/>
											<p className="text-red-600 mb-2">
												{errors.email?.message}
											</p>
										</div>
										<div className="flex w-full flex-col gap-2">
											<label htmlFor="telegram-input" className={labelStyle}>
												Telegram (optional)
											</label>
											<input
												id="telegram-input"
												type="text"
												className={inputStyle}
												placeholder="Enter your telegram address"
												{...register("telegram")}
											/>
											<p className="text-red-600 mb-2">
												{errors.telegram?.message}
											</p>
										</div>
										<div className="flex w-full flex-col gap-2">
											<label htmlFor="message-input" className={labelStyle}>
												Message *
											</label>
											<textarea
												id="message-input"
												className={inputStyle}
												placeholder="Tell us why you want to connect with them. Keep your message concise and to the point."
												{...register("message")}
											/>
											<p className="text-red-600 mb-2">
												{errors.message?.message}
											</p>
										</div>
									</div>
									<div className="flex flex-row gap-4 mt-10 justify-end">
										<Button
											className="text-zinc-900 text-lg bg-transparent border-black border dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-900 hover:text-white disabled:hover:bg-transparent disabled:hover:text-zinc-900"
											onClick={closeModal}
											disabled={isLoading}
										>
											Cancel
										</Button>
										<Button
											className="text-white px-6 text-lg bg-brand-blue border-brand-blue  hover:bg-brand-blue hover:text-white"
											type="submit"
											disabled={isLoading}
											isLoading={isLoading}
										>
											Send
										</Button>
									</div>
								</form>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
};
