import { Suspense } from "react"
import { NewProjectsPage } from "@/components/Pages/NewProjects"
import { PROJECT_NAME } from "@/constants/brand"
import { customMetadata } from "@/utilities/meta"

export const metadata = customMetadata({
  title: `Explore projects utilizing ${PROJECT_NAME}`,
  description: `Thousands of projects utilize ${PROJECT_NAME} to track their grants, share project progress and build reputation. Explore projects making a difference.`,
})

export default function Projects() {
  return (
    <Suspense>
      <NewProjectsPage />
    </Suspense>
  )
}
