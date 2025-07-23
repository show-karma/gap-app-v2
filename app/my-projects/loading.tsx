import { LoadingCard } from "@/components/Pages/MyProjects/LoadingCard";

export default function Loading() {
	const loadingArray = Array.from({ length: 12 }, (_, index) => index);

	return (
		<div className="px-4 sm:px-6 lg:px-12 py-5">
			<div className="mt-5 w-full gap-5">
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-4 justify-start">
						<div className="grid grid-cols-4 gap-7 pb-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
							{loadingArray.map((item) => (
								<LoadingCard key={item} />
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
