import { Menu, Transition } from "@headlessui/react";
import {
	ChevronDownIcon,
	EllipsisVerticalIcon,
	PlusIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import pluralize from "pluralize";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { DeleteDialog } from "@/components/DeleteDialog";
import { pickColor } from "@/components/GrantCard";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGroupedIndicators } from "@/hooks/useGroupedIndicators";
import {
	type Category,
	ImpactIndicator,
	type ImpactSegment,
} from "@/types/impactMeasurement";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { cn } from "@/utilities/tailwind";
import { ActivityOutcomeModal } from "./ActivityOutcomeModal";

interface CategoryViewProps {
	selectedCategory: Category;
	viewType: "all" | "output" | "outcome";
	setViewType: (value: "all" | "output" | "outcome") => void;
	onRefreshCategory?: () => void;
	communityId: string;
}

// Custom Dropdown Menu Component
const DropdownMenu = ({
	value,
	onChange,
	options,
}: {
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const selectedOption = options.find((option) => option.value === value);

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none"
			>
				<span>{selectedOption?.label || "Select option"}</span>
				<ChevronDownIcon
					className={`ml-2 h-4 w-4 transition-transform ${
						isOpen ? "rotate-180" : ""
					}`}
				/>
			</button>

			{isOpen && (
				<div className="absolute right-0 z-10 mt-1 w-full bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md shadow-lg">
					<div className="py-1">
						{options.map((option) => (
							<button
								key={option.value}
								onClick={() => {
									onChange(option.value);
									setIsOpen(false);
								}}
								className={`block w-full text-left px-4 py-2 text-sm ${
									value === option.value
										? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
										: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
								}`}
							>
								{option.label}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export const CategoryView = ({
	selectedCategory,
	viewType,
	setViewType,
	onRefreshCategory,
	communityId,
}: CategoryViewProps) => {
	const { address } = useAccount();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [initialModalType, setInitialModalType] = useState<
		"output" | "outcome"
	>("output");
	const [editingSegment, setEditingSegment] = useState<ImpactSegment | null>(
		null,
	);
	const [isDeletingSegment, setIsDeletingSegment] = useState<string | null>(
		null,
	);

	const {
		data: groupedIndicators = {
			communityAdminCreated: [],
			projectOwnerCreated: [],
		},
		isLoading: isLoadingIndicators,
	} = useGroupedIndicators({
		communityId: communityId,
	});

	const impact_indicators = useMemo(
		() => [
			...groupedIndicators.communityAdminCreated,
			...groupedIndicators.projectOwnerCreated,
		],
		[
			groupedIndicators.communityAdminCreated,
			groupedIndicators.projectOwnerCreated,
		],
	);

	// Count activities and outcomes for a category
	const getCategoryStats = (category: Category) => {
		const outputs =
			category.impact_segments?.filter((segment) => segment.type === "output")
				?.length || 0;
		const outcomes =
			category.impact_segments?.filter((segment) => segment.type === "outcome")
				?.length || 0;
		return { outputs, outcomes };
	};

	// Filter segments based on view type
	const getFilteredSegments = () => {
		if (!selectedCategory) return [];

		return (
			selectedCategory.impact_segments?.filter((segment) => {
				if (viewType === "all") return true;
				return segment.type === viewType;
			}) || []
		);
	};

	const hasSegments =
		selectedCategory?.impact_segments &&
		selectedCategory.impact_segments.length > 0;
	const filteredSegments = getFilteredSegments();
	const hasFilteredSegments = filteredSegments.length > 0;

	// Options for the dropdown
	const filterOptions = [
		{ value: "all", label: "All" },
		{ value: "output", label: "Activities" },
		{ value: "outcome", label: "Outcomes" },
	];

	// Open modal with specific initial type
	const openModalWithType = (type: "output" | "outcome") => {
		setInitialModalType(type);
		setIsModalOpen(true);
	};

	// Handle button click based on context
	const handleCreateButtonClick = () => {
		if (viewType === "output") {
			openModalWithType("output");
		} else if (viewType === "outcome") {
			openModalWithType("outcome");
		} else {
			setIsModalOpen(true);
		}
	};

	const handleDeleteSegment = async (segmentId: string) => {
		try {
			setIsDeletingSegment(segmentId);
			const [, error] = await fetchData(
				INDEXER.CATEGORIES.IMPACT_SEGMENTS.DELETE(selectedCategory.id),
				"DELETE",
				{
					segmentId,
				},
			);

			if (error) throw error;

			toast.success("Activity/Outcome deleted successfully");

			if (onRefreshCategory) {
				onRefreshCategory();
			}
		} catch (error) {
			errorManager(
				"Failed to delete impact segment",
				error,
				{
					segmentId,
					address,
					categoryId: selectedCategory.id,
				},
				{ error: MESSAGES.ACTIVITY_OUTCOME.DELETE.ERROR },
			);
		} finally {
			setIsDeletingSegment(null);
		}
	};

	return (
		<div className="w-full flex flex-col gap-0 flex-1">
			{/* Category Header */}
			<div className="rounded border border-gray-300 dark:border-zinc-700 py-4 px-4 flex justify-between items-center mb-6">
				<div className="flex flex-row gap-4 items-center">
					<div className="flex items-center justify-center w-10 h-10 rounded-sm bg-indigo-50 dark:bg-zinc-800">
						<Image
							alt="Category"
							width={24}
							height={24}
							src="/icons/box.svg"
							className="text-[#8098F9]"
						/>
					</div>
					<div className="flex flex-col gap-0">
						<h1 className="text-2xl font-bold">{selectedCategory.name}</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							{getCategoryStats(selectedCategory).outputs}{" "}
							{pluralize(
								"Activity",
								getCategoryStats(selectedCategory).outputs,
							)}{" "}
							and {getCategoryStats(selectedCategory).outcomes}{" "}
							{pluralize(
								"Outcome",
								getCategoryStats(selectedCategory).outcomes,
							)}{" "}
							tracked
						</p>
					</div>
				</div>
				<Button
					className="flex items-center gap-1 text-white max-md:hidden"
					onClick={handleCreateButtonClick}
				>
					Create Activity / Outcome
					<PlusIcon className="h-4 w-4" />
				</Button>
				<Button
					className="items-center gap-1 text-white max-md:flex hidden"
					onClick={handleCreateButtonClick}
				>
					Create
					<PlusIcon className="h-4 w-4" />
				</Button>
			</div>

			{/* Filters - Only show if there are segments */}
			{hasSegments && (
				<div className="flex justify-end mb-6">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							View
						</span>
						<div className="w-36">
							<DropdownMenu
								value={viewType}
								onChange={(value) =>
									setViewType(value as "all" | "output" | "outcome")
								}
								options={filterOptions}
							/>
						</div>
					</div>
				</div>
			)}

			{/* Empty State */}
			{!hasSegments && (
				<div className="rounded border border-gray-300 border-dashed flex-1 h-full dark:border-zinc-700 p-6 flex flex-col gap-8 items-center justify-center text-center">
					<Image
						src="/icons/outcome.svg"
						alt="Outcome"
						width={40}
						height={40}
					/>
					<p className="text-gray-900 text-xl text-center font-semibold dark:text-gray-400">
						No outcomes or activities have been defined yet
					</p>
				</div>
			)}

			{/* Filter Empty State */}
			{hasSegments && !hasFilteredSegments && (
				<div className="rounded border border-gray-300 dark:border-zinc-700 py-12 px-8 flex flex-col items-center justify-center text-center">
					<div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-full mb-4">
						<Image
							alt="No results"
							width={32}
							height={32}
							src="/icons/search.svg"
							className="text-indigo-500"
						/>
					</div>
					<h3 className="text-lg font-semibold mb-2">
						No{" "}
						{viewType === "output"
							? "activities"
							: viewType === "outcome"
								? "outcomes"
								: "items"}{" "}
						found
					</h3>
					<p className="text-gray-500 dark:text-gray-400 mb-4">
						{viewType === "all"
							? "This category doesn&#39;t have any activities or outcomes yet."
							: viewType === "output"
								? "This category doesn&#39;t have any activities yet."
								: "This category doesn&#39;t have any outcomes yet."}
					</p>
					<Button
						className="flex items-center gap-1 text-white"
						onClick={() =>
							openModalWithType(viewType === "outcome" ? "outcome" : "output")
						}
					>
						Create{" "}
						{viewType === "outcome"
							? "Outcome"
							: viewType === "output"
								? "Activity"
								: "Activity / Outcome"}
						<PlusIcon className="h-4 w-4" />
					</Button>
				</div>
			)}

			{/* Cards List - Only show if there are filtered segments */}
			{hasFilteredSegments && (
				<div className="grid grid-cols-1 gap-0 rounded border border-gray-300 dark:border-zinc-700 divide-y divide-gray-300 dark:divide-zinc-700">
					{filteredSegments.map((segment, index) => (
						<div key={segment.id} className={cn("p-5 relative")}>
							<div className="absolute top-4 right-4">
								<Menu as="div" className="relative inline-block text-left">
									<div>
										<Menu.Button className="p-1 rounded-md text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800">
											<EllipsisVerticalIcon
												className="h-6 w-6"
												aria-hidden="true"
											/>
										</Menu.Button>
									</div>
									<Transition
										as={Fragment}
										enter="transition ease-out duration-100"
										enterFrom="transform opacity-0 scale-95"
										enterTo="transform opacity-100 scale-100"
										leave="transition ease-in duration-75"
										leaveFrom="transform opacity-100 scale-100"
										leaveTo="transform opacity-0 scale-95"
									>
										<Menu.Items className="absolute right-0 mt-1 w-48 origin-top-right bg-white dark:bg-zinc-800 divide-y divide-gray-100 dark:divide-gray-700 rounded-md shadow-lg ring-1 ring-black/5 focus:outline-none z-20">
											<div className="px-1 py-1">
												<Menu.Item>
													{({ active }) => (
														<button
															className={`${
																active ? "bg-gray-100 dark:bg-zinc-700" : ""
															} w-full px-4 py-2 text-left flex items-center text-sm`}
															onClick={() => {
																setEditingSegment(segment);
																setIsModalOpen(true);
															}}
														>
															<PencilSquareIcon className="h-4 w-4 mr-2" />
															Edit{" "}
															{segment.type === "output"
																? "Activity"
																: "Outcome"}
														</button>
													)}
												</Menu.Item>
												<Menu.Item>
													{({ active }) => (
														<DeleteDialog
															title={`Are you sure you want to delete ${segment.name}?`}
															deleteFunction={() =>
																handleDeleteSegment(segment.id)
															}
															isLoading={isDeletingSegment === segment.id}
															buttonElement={{
																icon: <TrashIcon className="h-4 w-4 mr-2" />,
																text: "Delete",
																styleClass: `${
																	active
																		? "bg-gray-100 dark:bg-zinc-700"
																		: "bg-transparent"
																} hover:bg-gray-100 dark:hover:bg-zinc-700 font-normal w-full px-4 py-2 text-left flex items-center text-sm text-red-500`,
															}}
														/>
													)}
												</Menu.Item>
											</div>
										</Menu.Items>
									</Transition>
								</Menu>
							</div>

							<h3
								className={cn(
									"text-gray-900 dark:text-white text-lg font-bold mb-2 pl-4",
								)}
								style={{
									borderLeft: `4px solid ${pickColor(index)}`,
								}}
							>
								{segment.name}
							</h3>
							<p className="text-gray-900 text-base font-normal dark:text-gray-400 mb-5">
								{segment.description}
							</p>

							<div className="flex flex-wrap items-center gap-3 flex-row max-lg:items-start max-lg:flex-col">
								<span
									className={`px-3 py-1.5 gap-2 flex flex-row rounded-full text-gray-900 text-sm ${
										segment.type === "outcome" ? "bg-[#DAF8D9]" : "bg-[#E0EAFF]"
									}`}
								>
									<Image
										src={`/icons/${
											segment.type === "output" ? "activity" : "outcome"
										}.svg`}
										width={20}
										height={20}
										alt={segment.type}
									/>
									{segment.type === "output" ? "Activity" : "Outcome"}
								</span>

								<div className="flex items-center flex-row gap-2 max-lg:flex-col max-lg:items-start">
									<span className="text-gray-900 text-base font-semibold">
										Indicators ({segment.impact_indicators?.length || ""})
									</span>
									<div className="flex gap-1 flex-wrap flex-row">
										{segment.impact_indicators?.map((indicator, index) => (
											<span
												key={indicator.id}
												className="text-gray-900 dark:text-white text-sm font-normal"
											>
												<u>{indicator.name}</u>{" "}
												{(segment.impact_indicators?.length || 0) - 1 !== index
													? ","
													: null}
											</span>
										))}
										{!segment.impact_indicators?.length || 0 ? (
											<span className="text-gray-900 dark:text-white text-sm font-normal underline">
												No indicators
											</span>
										) : null}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Modal for creating/editing activity/outcome */}
			<ActivityOutcomeModal
				isOpen={isModalOpen}
				onClose={() => {
					setIsModalOpen(false);
					setEditingSegment(null);
				}}
				category={selectedCategory}
				impact_indicators={impact_indicators}
				communityId={communityId}
				isLoadingIndicators={isLoadingIndicators}
				onSuccess={() => {
					if (onRefreshCategory) {
						onRefreshCategory();
					}
					setEditingSegment(null);
				}}
				initialType={initialModalType}
				editingSegment={editingSegment}
			/>
		</div>
	);
};
