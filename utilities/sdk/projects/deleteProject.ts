import { TxStepperSteps } from "@/store/txStepper";
import { PAGES } from "@/utilities/pages";
import { Project } from "@show-karma/karma-gap-sdk";
import { Hex } from "viem";

export const deleteProject = async (
  project: Project,
  signer: any,
  gap: any,
  router: any,
  changeStepperStep: (step: TxStepperSteps) => void
) => {
  try {
    if (!gap) return;
    await project.revoke(signer as any, changeStepperStep).then(async () => {
      let retries = 1000;
      let fetchedProject: Project | null = null;
      changeStepperStep("indexing");
      while (retries > 0) {
        // eslint-disable-next-line no-await-in-loop
        fetchedProject = await (project.details?.slug
          ? gap.fetch.projectBySlug(project.details.slug)
          : gap.fetch.projectById(project.uid as Hex)
        ).catch(() => null);
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
    throw new Error(error);
  }
};
