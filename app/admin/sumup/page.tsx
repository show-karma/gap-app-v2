/* eslint-disable @next/next/no-img-element */

import { Suspense } from "react";
import SumupAdminPage from "@/components/Pages/Admin/SumupAdmin";
import { Spinner } from "@/components/Utilities/Spinner";
import { defaultMetadata } from "@/utilities/meta";

export const metadata = defaultMetadata;

export default function Page() {
	return (
		<Suspense
			fallback={
				<div className="flex h-screen w-full items-center justify-center">
					<Spinner />
				</div>
			}
		>
			<SumupAdminPage />
		</Suspense>
	);
}
