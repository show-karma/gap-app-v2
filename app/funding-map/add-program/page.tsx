import React from "react"
import { AddProgramWrapper } from "@/components/Pages/ProgramRegistry/AddProgramWrapper"
import { PROJECT_NAME } from "@/constants/brand"
import { customMetadata } from "@/utilities/meta"

export const metadata = customMetadata({
  title: `${PROJECT_NAME} - Grant Program Registry`,
  description: "Comprehensive list of all the grant programs in the web3 ecosystem.",
})

export default function AddProgramPage() {
  return <AddProgramWrapper />
}
