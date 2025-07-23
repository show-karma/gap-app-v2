"use client";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { Fragment } from "react";
import { type TxStepperSteps, useStepper } from "@/store/modals/txStepper";

const StepNumberDictionary: Record<TxStepperSteps, number> = {
	preparing: 1,
	pending: 2,
	confirmed: 3,
	indexing: 4,
	indexed: 5,
};
const StepTextDictionary: Record<TxStepperSteps, string> = {
	preparing: "Preparing to write to blockchain",
	pending: "Executing the onchain transaction",
	confirmed: "Waiting for confirmation",
	indexing: "Indexing the blockchain data",
	indexed: "Indexing complete",
};
const Step = ({
	step,
	isActive,
	stepNumber,
	activeNumber,
}: {
	step: TxStepperSteps;
	isActive: boolean;
	stepNumber: number;
	activeNumber: number;
}) => {
	const lastSteps = Object.values(StepNumberDictionary).filter(
		(item) => activeNumber >= item,
	);
	return (
		<div className="flex flex-col gap-1">
			<div className="flex flex-row gap-3 items-center">
				<div
					className="w-8 h-8 flex flex-col justify-center items-center rounded-full"
					style={{
						backgroundColor: lastSteps.includes(stepNumber)
							? "#4c6fff"
							: "#535c68",
					}}
				>
					{isActive ? (
						<div
							className={
								"h-4 w-4 animate-spin rounded-full border-4 border-dashed border-white dark:border-white"
							}
						/>
					) : (
						<p className="text-white">{stepNumber}</p>
					)}
				</div>
				{lastSteps.includes(stepNumber) ? (
					<p className="text-lg font-medium dark:text-zinc-100 text-black">
						{StepTextDictionary[step as TxStepperSteps]}
					</p>
				) : (
					<p className="text-lg font-medium dark:text-zinc-300 text-[#535c68]">
						{StepTextDictionary[step as TxStepperSteps]}
					</p>
				)}
			</div>
		</div>
	);
};

export const StepperDialog = () => {
	const { isStepperOpen: isOpen, stepperStep, setIsStepper } = useStepper();

	const closeModal = () => {
		setIsStepper(false);
	};

	const stepCounter = Object.keys(StepNumberDictionary);

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog as="div" className="relative z-50" onClose={closeModal}>
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
							<Dialog.Panel className="w-full max-w-2xl h-max transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
								<button
									className="p-2 text-black dark:text-white absolute top-4 right-4"
									onClick={() => closeModal()}
								>
									<XMarkIcon className="w-6 h-6" />
								</button>
								<div className="flex flex-col gap-2">
									<div className="flex flex-col gap-1">
										<h2 className="text-2xl font-bold dark:text-zinc-200 text-black">
											Saving your information
										</h2>
									</div>
									<div className="flex flex-col gap-3 mt-4 mb-4">
										{stepCounter.map((item) => (
											<Step
												key={item}
												step={item as TxStepperSteps}
												isActive={stepperStep === item}
												stepNumber={
													StepNumberDictionary[item as TxStepperSteps]
												}
												activeNumber={StepNumberDictionary[stepperStep]}
											/>
										))}
									</div>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
};
