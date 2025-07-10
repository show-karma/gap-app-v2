import { errorManager } from "@/components/Utilities/errorManager";
import { TxStepperSteps } from "@/store/modals/txStepper";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { PAGES } from "@/utilities/pages";
import { Project } from "@show-karma/karma-gap-sdk";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { QueryObserverResult } from "@tanstack/react-query";
import { Hex } from "viem";

export const deleteProject = async (
  project: Project,
  signer: any,
  gap: any,
  router: any,
  changeStepperStep: (step: TxStepperSteps) => void,
  refreshProject: () => Promise<QueryObserverResult<IProjectResponse, Error>>
) => {
  try {
    if (!gap) return;
    await project.revoke(signer as any, changeStepperStep).then(async (res) => {
      let retries = 1000;
      let fetchedProject: IProjectResponse | undefined = undefined;
      changeStepperStep("indexing");
      const txHash = res?.tx[0]?.hash;
      if (txHash) {
        await fetchData(
          INDEXER.ATTESTATION_LISTENER(txHash, project.chainID),
          "POST",
          {}
        );
      }
      while (retries > 0) {
        // eslint-disable-next-line no-await-in-loop
        fetchedProject = (await refreshProject())?.data;
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
  } catch (error: any) {
    errorManager(`Error deleting project: ${project.uid}`, error);
    throw new Error(error);
  }
};
