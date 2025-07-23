import { Card } from "@tremor/react";

export const OutputsAndOutcomesLoading = () => {
	return (
		<div className="w-full max-w-[100rem] my-8">
			<div className="flex flex-col gap-8">
				{[1, 2].map((item) => (
					<div
						key={item}
						className="w-full flex flex-col gap-4 p-6 bg-white border border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700 rounded-md shadow-sm"
					>
						<div className="flex items-center justify-between flex-row flex-wrap max-md:items-start gap-4">
							<div className="space-y-1 flex flex-col flex-1 gap-1">
								<div className="h-6 w-48 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
								<div className="h-4 w-96 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
								<div className="h-4 w-32 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
							</div>
						</div>

						<div className="flex flex-row gap-4 max-md:flex-col-reverse">
							<div className="flex flex-1">
								<div className="w-full">
									<div className="flex flex-col">
										<div className="overflow-y-auto overflow-x-auto rounded">
											<table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700 rounded border border-gray-200 dark:border-zinc-700">
												<thead>
													<tr>
														<th className="px-4 py-3 text-left">
															<div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
														</th>
														<th className="px-4 py-3 text-left">
															<div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
														</th>
														<th className="px-4 py-3 text-left">
															<div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
														</th>
														<th className="px-4 py-3 text-left">
															<div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
														</th>
														<th className="px-4 py-3 text-left" />
													</tr>
												</thead>
												<tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
													{[1, 2, 3].map((row) => (
														<tr key={row}>
															<td className="px-4 py-2">
																<div className="h-4 w-16 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
															</td>
															<td className="px-4 py-2">
																<div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
															</td>
															<td className="px-4 py-2">
																<div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
															</td>
															<td className="px-4 py-2">
																<div className="h-4 w-48 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
															</td>
															<td className="px-4 py-2" />
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								</div>
							</div>
							<div className="flex flex-1 flex-col gap-5">
								<Card className="bg-white dark:bg-zinc-800 rounded">
									<div className="h-4 w-32 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse mb-4" />
									<div className="h-48 w-full bg-gray-200 dark:bg-zinc-700 rounded animate-pulse mt-4" />
								</Card>
							</div>
						</div>

						<div className="flex items-center gap-4 w-full justify-end">
							<div className="h-8 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
