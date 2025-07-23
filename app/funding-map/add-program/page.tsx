import React from "react";
import { AddProgramWrapper } from "@/components/Pages/ProgramRegistry/AddProgramWrapper";
import { customMetadata } from "@/utilities/meta";

export const metadata = customMetadata({
	title: "Karma GAP - Grant Program Registry",
	description:
		"Comprehensive list of all the grant programs in the web3 ecosystem.",
});

export default function AddProgramPage() {
	return <AddProgramWrapper />;
}
