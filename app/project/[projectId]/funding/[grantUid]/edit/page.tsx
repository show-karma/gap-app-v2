"use client";
import dynamic from "next/dynamic";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import { useGrantStore } from "@/store/grant";

const NewGrant = dynamic(
	() =>
		import(
			"@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant"
		).then((mod) => mod.NewGrant),
	{
		loading: () => <DefaultLoading />,
	},
);
export default function Page() {
	const { grant } = useGrantStore();

	return <NewGrant grantToEdit={grant} />;
}
