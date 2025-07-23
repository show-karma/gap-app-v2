import type { FC } from "react";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";

const rowClass =
	"text-normal  text-zinc-800 dark:text-zinc-200 text-base break-normal line-clamp-2 w-full max-w-[320px] px-1 py-2";
const headerClass =
	"text-normal  text-zinc-800 dark:text-zinc-200 text-base w-max max-w-[320px]";

interface AllProjectsLoadingTableProps {
	pageSize: number;
}

export const AllProjectsLoadingTable: FC<AllProjectsLoadingTableProps> = ({
	pageSize,
}) => {
	// create an empty array of length pageSize
	const rows = Array.from({ length: pageSize }, (_, index) => index);

	return (
		<table className="border-x border-x-zinc-300 border-y border-y-zinc-300 w-full table-fixed">
			<thead className="border-x border-x-zinc-300 border-y border-y-zinc-300 w-full">
				<tr className="divide-x w-full">
					<th className={cn(headerClass)}>Date</th>
					<th className={cn(headerClass)}>Project</th>
					<th className={cn(headerClass)}>Categories</th>
					<th className={cn(headerClass)}>Description</th>
					<th className={cn(headerClass)}>Contact Info</th>
				</tr>
			</thead>
			<tbody className="divide-y divide-x w-full">
				{rows.map((row) => (
					<tr key={row}>
						<td className="w-max min-w-max">
							<Skeleton className="w-full h-16" />
						</td>
						<td className="w-1/5 min-w-[320px]">
							<Skeleton className="w-full h-16" />
						</td>
						<td className="w-1/5 min-w-[320px]">
							<Skeleton className="w-full h-16" />
						</td>
						<td className="w-1/5 min-w-[320px]">
							<Skeleton className="w-full h-16" />
						</td>
						<td className="w-1/5 min-w-[320px]">
							<Skeleton className="w-full h-16" />
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};
