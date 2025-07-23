"use client";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/Utilities/Spinner";

const AddProgram = dynamic(
	() =>
		import("@/components/Pages/ProgramRegistry/AddProgram").then(
			(mod) => mod.default,
		),
	{
		loading: () => (
			<div className="flex h-screen w-full items-center justify-center">
				<Spinner />
			</div>
		),
	},
);
export const AddProgramWrapper = () => {
	return <AddProgram />;
};
