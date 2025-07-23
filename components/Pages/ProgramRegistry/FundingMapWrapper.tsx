"use client";
import dynamic from "next/dynamic";
import { LoadingPrograms } from "@/components/Pages/ProgramRegistry/Loading/Programs";

const ProgramsExplorer = dynamic(
	() =>
		import("@/components/Pages/ProgramRegistry/ProgramsExplorer").then(
			(mod) => mod.ProgramsExplorer,
		),
	{
		loading: () => <LoadingPrograms />,
	},
);
export const FundingMapWrapper = () => {
	return <ProgramsExplorer />;
};
