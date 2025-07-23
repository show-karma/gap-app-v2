"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ProgramFilter } from "./ProgramFilter";
import { ProjectFilter } from "./ProjectFilter";

export const CommunityImpactFilterRow = () => {
	const pathname = usePathname();
	const [aggregateView, setAggregateView] = useState(false);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const aggregateParam = params.get("aggregate");
		setAggregateView(aggregateParam === "true");
	}, []);

	const isProjectDiscovery = pathname?.includes("project-discovery");
	if (isProjectDiscovery) return null;

	const handleToggleAggregateView = () => {
		const newValue = !aggregateView;
		setAggregateView(newValue);
		const params = new URLSearchParams(window.location.search);
		params.set("aggregate", String(newValue));
		window.history.pushState(null, "", `?${params.toString()}`);
	};

	return (
		<div className="px-3 py-4 bg-gray-100 dark:bg-zinc-900 rounded-lg flex flex-row justify-between items-center w-full gap-16 max-lg:flex-col max-lg:gap-4 max-lg:justify-start max-lg:items-start">
			<div
				className={`flex flex-row gap-8 max-lg:gap-2 items-center max-lg:flex-col  max-lg:items-start max-lg:justify-start ${
					aggregateView ? "opacity-50 pointer-events-none" : ""
				}`}
			>
				<h3 className="text-slate-800 dark:text-zinc-100 text-xl font-semibold font-['Inter'] leading-normal">
					Filter by
				</h3>
				<div className="flex flex-row w-max max-w-full">
					<ProgramFilter />
				</div>
				<div className="flex flex-row w-max max-w-full">
					<ProjectFilter />
				</div>
			</div>
			<div className="flex flex-row w-max max-w-full">
				<div className="text-base flex flex-row items-center gap-2 font-medium">
					View aggregate impact
					<div className="flex items-center ml-2 mr-3">
						<button
							type="button"
							role="switch"
							aria-checked={aggregateView}
							className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
								aggregateView
									? "bg-primary-500 dark:bg-primary-400"
									: "bg-gray-300 dark:bg-zinc-700"
							}`}
							tabIndex={0}
							onClick={handleToggleAggregateView}
						>
							<span className="sr-only">Enable aggregate view</span>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-200 transition-transform duration-200 ease-in-out hover:shadow-sm ${
									aggregateView ? "translate-x-6" : "translate-x-1"
								}`}
							/>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
