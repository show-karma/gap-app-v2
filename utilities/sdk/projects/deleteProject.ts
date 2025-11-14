import type { Project } from "@show-karma/karma-gap-sdk"
import type { Hex } from "viem"
import { errorManager } from "@/components/Utilities/errorManager"
import type { TxStepperSteps } from "@/store/modals/txStepper"
import fetchData from "@/utilities/fetchData"
import { INDEXER } from "@/utilities/indexer"
import { PAGES } from "@/utilities/pages"

export const deleteProject = async (
  project: Project,
  signer: any,
  gap: any,
  router: any,
  changeStepperStep: (step: TxStepperSteps) => void
) => {
  try {
    if (!gap) return
    await project.revoke(signer as any, changeStepperStep).then(async (res) => {
      let retries = 1000
      let fetchedProject: Project | null = null
      changeStepperStep("indexing")
      const txHash = res?.tx[0]?.hash
      if (txHash) {
        await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, project.chainID), "POST", {})
      }
      while (retries > 0) {
        // eslint-disable-next-line no-await-in-loop
        fetchedProject = await (project.details?.slug
          ? gap.fetch.projectBySlug(project.details.slug)
          : gap.fetch.projectById(project.uid as Hex)
        ).catch(() => null)
        if (!fetchedProject) {
          retries = 0
          changeStepperStep("indexed")
          router.push(PAGES.MY_PROJECTS)
          return
        }
        retries -= 1
        // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
    })
  } catch (error: any) {
    errorManager(`Error deleting project: ${project.uid}`, error)
    throw new Error(error)
  }
}
