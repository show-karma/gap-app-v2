import {
	CheckCircleIcon,
	PencilSquareIcon,
	ShareIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { FC } from "react";
import { MilestoneVerificationSection } from "@/components/Shared/MilestoneVerification";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { queryClient } from "@/components/Utilities/WagmiProvider";
import { useAllMilestones } from "@/hooks/useAllMilestones";
import { useMilestone } from "@/hooks/useMilestone";
import { useMilestoneActions } from "@/hooks/useMilestoneActions";
import { useProjectStore } from "@/store";
import type { UnifiedMilestone } from "@/types/roadmap";
import { formatDate } from "@/utilities/formatDate";
import { ReadMore } from "@/utilities/ReadMore";
import { shareOnX } from "@/utilities/share/shareOnX";
import { SHARE_TEXTS } from "@/utilities/share/text";
import { cn } from "@/utilities/tailwind";
import { containerClassName } from "../ActivityCard";
import { ActivityAttribution } from "./ActivityAttribution";
import { ActivityStatus } from "./ActivityStatus";
import { ActivityStatusHeader } from "./ActivityStatusHeader";

const ProjectObjectiveCompletion = dynamic(
	() =>
		import("@/components/Forms/ProjectObjectiveCompletion").then(
			(mod) => mod.ProjectObjectiveCompletionForm,
		),
	{
		ssr: false,
	},
);

const ObjectiveSimpleOptionsMenu = dynamic(
	() =>
		import(
			"@/components/Pages/Project/Objective/ObjectiveSimpleOptionsMenu"
		).then((mod) => mod.ObjectiveSimpleOptionsMenu),
	{
		ssr: false,
	},
);

const GrantMilestoneSimpleOptionsMenu = dynamic(
	() =>
		import("@/components/Milestone/GrantMilestoneSimpleOptionsMenu").then(
			(mod) => mod.GrantMilestoneSimpleOptionsMenu,
		),
	{
		ssr: false,
	},
);

const GrantMilestoneCompletion = dynamic(
	() =>
		import("@/components/Forms/GrantMilestoneCompletion").then(
			(mod) => mod.GrantMilestoneCompletionForm,
		),
	{
		ssr: false,
	},
);

// Dynamic import for editing milestone completion form
const MilestoneUpdateForm = dynamic(
	() =>
		import("@/components/Forms/MilestoneUpdate").then(
			(mod) => mod.MilestoneUpdateForm,
		),
	{
		ssr: false,
	},
);

interface MilestoneCardProps {
	milestone: UnifiedMilestone;
	isAuthorized: boolean;
}

export const MilestoneCard: FC<MilestoneCardProps> = ({
	milestone,
	isAuthorized,
}) => {
	const { isCompleting, handleCompleting, isEditing, handleEditing } =
		useMilestoneActions();
	const { multiGrantUndoCompletion } = useMilestone();
	const { title, description, completed, type } = milestone;
	const { project } = useProjectStore();
	const { projectId } = useParams();
	const { refetch } = useAllMilestones(projectId as string);

	// project milestone-specific properties
	const projectMilestone = milestone.source.projectMilestone;
	const attester =
		projectMilestone?.attester ||
		milestone.source.grantMilestone?.milestone.attester ||
		"";
	const createdAt = milestone.createdAt;

	// grant milestone-specific properties
	const grantMilestone = milestone.source.grantMilestone;
	const grantTitle = grantMilestone?.grant.details?.data.title;
	const programId = grantMilestone?.grant.details?.data.programId;
	const communityData = grantMilestone?.grant.community?.details?.data;
	const endsAt = milestone.endsAt;

	// completion information
	const completionReason =
		projectMilestone?.completed?.data?.reason ||
		grantMilestone?.milestone.completed?.data?.reason;
	const completionProof =
		projectMilestone?.completed?.data?.proofOfWork ||
		grantMilestone?.milestone.completed?.data?.proofOfWork;
	const completionDate =
		projectMilestone?.completed?.createdAt ||
		grantMilestone?.milestone.completed?.createdAt;
	const completionAttester =
		projectMilestone?.completed?.attester ||
		grantMilestone?.milestone.completed?.attester;
	const verifiedMilestones =
		projectMilestone?.verified?.length ||
		grantMilestone?.milestone.verified?.length;

	// Function to render project milestone completion form or details
	const renderMilestoneCompletion = () => {
		if (isCompleting) {
			if (type === "milestone" && projectMilestone) {
				return (
					<ProjectObjectiveCompletion
						objectiveUID={projectMilestone.uid}
						handleCompleting={handleCompleting}
					/>
				);
			} else if (type === "grant") {
				return (
					<GrantMilestoneCompletion
						milestone={milestone}
						handleCompleting={handleCompleting}
					/>
				);
			}
		}

		if (isEditing && type === "grant" && grantMilestone) {
			// For grant milestones, use the existing MilestoneUpdateForm
			return (
				<MilestoneUpdateForm
					milestone={grantMilestone.milestone}
					isEditing={true}
					previousData={grantMilestone.milestone.completed?.data}
					cancelEditing={async (editing: boolean) => {
						handleEditing(editing);
						// Refresh the activities list after successful editing
						if (!editing) {
							// Invalidate all relevant caches
							await Promise.all([
								queryClient.invalidateQueries({
									queryKey: ["all-milestones", projectId],
								}),
								queryClient.invalidateQueries({
									queryKey: ["projectMilestones", project?.uid],
								}),
								refetch(),
							]);
						}
					}}
				/>
			);
		}

		if (isEditing && type === "milestone") {
			return (
				<div
					className={cn(containerClassName, "flex flex-col gap-4 w-full p-4")}
				>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Project milestone editing is not yet implemented. Please use the
						revoke and re-complete workflow for now.
					</p>
					<Button
						className="w-max bg-transparent border border-gray-300 text-gray-600 hover:bg-gray-50"
						onClick={async () => {
							handleEditing(false);
							// Refresh the activities list when canceling editing
							await Promise.all([
								queryClient.invalidateQueries({
									queryKey: ["all-milestones", projectId],
								}),
								queryClient.invalidateQueries({
									queryKey: ["projectMilestones", project?.uid],
								}),
								refetch(),
							]);
						}}
					>
						Cancel
					</Button>
				</div>
			);
		}

		return (
			<div className={cn(containerClassName, "flex flex-col gap-1 w-full")}>
				<div className={"w-full flex-col flex gap-2 px-5 py-4"}>
					<div className="flex flex-row items-center justify-between gap-2 flex-wrap">
						<div className="flex flex-row items-center gap-3">
							<ActivityStatusHeader
								activityType="MilestoneUpdate"
								dueDate={null}
								showCompletionStatus={false}
								completed={true}
								completionStatusClassName="text-xs px-2 py-1"
								milestone={milestone}
							/>
						</div>
					</div>
					{completionReason ? (
						<div className="flex flex-col gap-1">
							<ReadMore side="left">{completionReason}</ReadMore>
						</div>
					) : null}
					{completionProof ? (
						<div className="flex flex-col gap-1">
							<p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
								Proof of Work:
							</p>
							<a
								href={completionProof}
								target="_blank"
								rel="noopener noreferrer"
								className="text-brand-blue hover:underline break-all"
							>
								{completionProof}
							</a>
						</div>
					) : null}
				</div>
				<ActivityAttribution
					createdAt={completionDate}
					attester={completionAttester}
					actions={
						isAuthorized ? (
							<div className="flex flex-row gap-3 max-sm:gap-4 items-center">
								<MilestoneVerificationSection
									milestone={milestone}
									title={`${title} - Reviews`}
								/>
								{/* Share Button */}
								<ExternalLink
									href={shareOnX(
										type === "grant" && grantMilestone
											? SHARE_TEXTS.MILESTONE_COMPLETED(
													grantTitle || "Grant",
													(project?.details?.data?.slug ||
														project?.uid) as string,
													grantMilestone.grant.uid,
												)
											: SHARE_TEXTS.PROJECT_ACTIVITY(
													title,
													(project?.details?.data?.slug ||
														project?.uid) as string,
												),
									)}
									className="flex flex-row gap-1 bg-transparent text-sm font-semibold text-gray-600 dark:text-zinc-100 hover:bg-transparent hover:opacity-75  h-6 w-6 items-center justify-center"
								>
									<ShareIcon className="h-5 w-5" />
								</ExternalLink>

								{/* Edit Button */}
								<Button
									className="flex flex-row gap-1 bg-transparent text-sm font-semibold text-gray-600 dark:text-zinc-100 hover:bg-transparent hover:opacity-75  h-6 w-6 p-0 items-center justify-center"
									onClick={() => handleEditing(true)}
								>
									<PencilSquareIcon className="h-5 w-5" />
								</Button>

								{/* Revoke Completion Button */}
								<Button
									className="flex flex-row gap-1 bg-transparent text-sm font-semibold text-red-500 hover:bg-transparent hover:opacity-75  h-6 w-6 p-0 items-center justify-center"
									onClick={() => multiGrantUndoCompletion(milestone)}
								>
									<TrashIcon className="h-5 w-5" />
								</Button>
							</div>
						) : undefined
					}
					isCompleted
				/>
			</div>
		);
	};

	return (
		<div className="flex flex-col w-full  gap-2.5 md:gap-5">
			{/* Main Milestone Card */}
			<div className={cn(containerClassName, "flex flex-col w-full")}>
				{/* Grants Related Section */}
				<div className="flex flex-col gap-3 w-full px-5 py-4">
					<div className="flex flex-col gap-3 w-full">
						<ActivityStatusHeader
							activityType="Milestone"
							dueDate={
								type === "grant" && endsAt ? formatDate(endsAt * 1000) : null
							}
							showCompletionStatus={true}
							completed={!!completed}
							completionStatusClassName="text-xs px-2 py-1"
							milestone={milestone}
						/>
						{/* Title */}
						<p className="text-xl font-bold text-[#101828] dark:text-zinc-100">
							{title}
						</p>
					</div>

					{/* Description */}
					{description ? (
						<div className="flex flex-col my-2">
							<ReadMore side="left">{description}</ReadMore>
						</div>
					) : null}
				</div>
				{/* Bottom Attribution with Actions */}
				<ActivityAttribution
					createdAt={createdAt}
					attester={attester}
					actions={
						isAuthorized ? (
							<div className="flex flex-row gap-6 items-center">
								{!completed && (
									<Button
										className="flex flex-row gap-1 border border-brand-blue text-brand-blue  text-sm font-semibold bg-white hover:bg-white dark:bg-transparent dark:hover:bg-transparent p-3  rounded-md max-sm:px-2 max-sm:py-1"
										onClick={() => handleCompleting(true)}
									>
										Mark Milestone Complete
										<CheckCircleIcon className="h-5 w-5" />
									</Button>
								)}

								{/* Options Menu with only Delete */}
								{type === "milestone" && projectMilestone ? (
									<ObjectiveSimpleOptionsMenu
										objectiveId={projectMilestone.uid}
									/>
								) : type === "grant" && grantMilestone ? (
									<GrantMilestoneSimpleOptionsMenu milestone={milestone} />
								) : null}
							</div>
						) : undefined
					}
				/>
			</div>
			{isCompleting || isEditing || completionReason || completionProof ? (
				<div className="flex flex-col w-full pl-8 md:pl-[120px]">
					{renderMilestoneCompletion()}
				</div>
			) : null}
		</div>
	);
};
