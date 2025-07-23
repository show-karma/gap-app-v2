import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { ProgramHeader } from "../ProgramHeader";

export const LoadingProgramTable = () => {
	const emptyArrayHeader = Array.from({ length: 7 });
	const emptyArrayRows = Array.from({ length: 12 });
	return (
		<div className="w-full flex flex-col">
			<div className="mt-8 flow-root">
				<div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
					<div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
						<table className="min-w-full divide-y divide-gray-300 h-full">
							<thead>
								<tr className="">
									{emptyArrayHeader.map((row, index) => {
										return (
											<th key={index}>
												<Skeleton className="h-9 w-full max-lg:min-w-40 rounded-lg border-0 my-2" />
											</th>
										);
									})}
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{emptyArrayRows.map((row, index) => {
									return (
										<tr key={index}>
											{emptyArrayHeader.map((row, indexH) => {
												return (
													<td key={indexH}>
														<Skeleton className="h-12 w-full max-lg:min-w-40 rounded-lg my-5" />
													</td>
												);
											})}
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
};

export const LoadingPrograms = () => {
	return (
		<section className="my-8 flex w-full max-w-full flex-col justify-between items-center gap-6 px-6 pb-7 max-2xl:px-4 max-md:px-4 max-md:pt-0 max-md:my-4">
			<ProgramHeader />

			<div className="flex flex-row items-center justify-end max-sm:justify-start gap-2.5  flex-wrap w-full">
				<div className="flex flex-row items-center gap-2 flex-wrap">
					<p className="text-black dark:text-white font-semibold">Status</p>
					<Skeleton className="w-12 h-7 rounded-full" />
					<Skeleton className="w-12 h-7 rounded-full" />
					<Skeleton className="w-12 h-7 rounded-full" />
				</div>
			</div>

			<div className="w-full">
				<div className="sm:items-center p-3 flex max-sm:flex-col flex-row gap-3 flex-wrap justify-between rounded-[4px] bg-[#F2F4F7] dark:bg-zinc-900">
					<div className="w-full max-w-[450px] max-lg:max-w-xs">
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
								<MagnifyingGlassIcon
									className="h-5 w-5 text-black dark:text-white"
									aria-hidden="true"
								/>
							</div>
							<Skeleton className="h-9 w-full rounded-full border-0 py-1.5 pr-10 pl-3" />
						</div>
					</div>
					<div className="flex flex-row gap-2 w-max flex-1 max-md:flex-wrap max-md:flex-col justify-end">
						<Skeleton className="min-w-40 h-12 w-full max-w-max max-md:max-w-full flex rounded-md py-3 px-4 shadow-sm ring-1 ring-inset ring-gray-300" />
						<Skeleton className="min-w-40 h-12 w-full max-w-max max-md:max-w-full flex rounded-md py-3 px-4 shadow-sm ring-1 ring-inset ring-gray-300" />
						<Skeleton className="min-w-40 h-12 w-full max-w-max max-md:max-w-full flex rounded-md py-3 px-4 shadow-sm ring-1 ring-inset ring-gray-300" />
					</div>
				</div>

				<LoadingProgramTable />
			</div>
		</section>
	);
};
