/* eslint-disable @next/next/no-img-element */

import { Suspense } from "react";
import { CommunitiesToAdmin } from "@/components/Pages/Admin";
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
			<CommunitiesToAdmin />
		</Suspense>
	);
}
