import type { GAP, Project, SignerOrProvider } from "@show-karma/karma-gap-sdk";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { errorManager } from "@/components/Utilities/errorManager";
import { getProject } from "@/services/project.service";
import type { TxStepperSteps } from "@/store/modals/txStepper";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";

export const deleteProject = async (
  project: Project,
  signer: SignerOrProvider,
  gap: GAP,
  router: AppRouterInstance,
  changeStepperStep: (step: TxStepperSteps) => void
) => {
  try {
    if (!gap) return;
    await project.revoke(signer, changeStepperStep).then(async (res) => {
      let retries = 5;
      changeStepperStep("indexing");
      const txHash = res?.tx[0]?.hash;
      if (txHash) {
        await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, project.chainID), "POST", {});
      }
      while (retries > 0) {
        // eslint-disable-next-line no-await-in-loop
        const fetchedProject = await getProject(project.details?.slug || project.uid);
        if (!fetchedProject) {
          retries = 0;
          changeStepperStep("indexed");
          router.push(PAGES.MY_PROJECTS);
          return;
        }
        retries -= 1;
        // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    });
  } catch (error: unknown) {
    errorManager(`Error deleting project: ${project.uid}`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};
