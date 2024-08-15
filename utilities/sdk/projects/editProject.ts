import { errorManager } from "@/components/Utilities/ErrorManager";
import { TxStepperSteps } from "@/store/modals/txStepper";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import {
  ExternalLink,
  Project,
  TExternalLink,
} from "@show-karma/karma-gap-sdk";

export const updateProject = async (
  project: Project,
  newProjectInfo: {
    title: string;
    description: string;
    tags: { name: string }[];
    businessModel?: string;
    stageIn?: string;
    raisedMoney?: string;
    pathToTake?: string;
    problem?: string;
    solution?: string;
    missionSummary?: string;
    locationOfImpact?: string;
  },
  data: {
    twitter?: string;
    github?: string;
    discord?: string;
    website?: string;
    linkedin?: string;
  },
  signer: any,
  gap: any,
  changeStepperStep: (step: TxStepperSteps) => void,
  closeModal: () => void
) => {
  const oldProjectData = JSON.parse(JSON.stringify(project.details?.data));
  try {
    let slug =
      project.details?.slug || (await gap.generateSlug(newProjectInfo.title));
    if (project.details?.title !== newProjectInfo.title) {
      slug = await gap.generateSlug(newProjectInfo.title);
    }
    const linkKeys = Object.keys(data);

    const linksArray: ExternalLink = linkKeys.map((key) => {
      return {
        url: data[key as keyof typeof data] || "",
        type: key as TExternalLink,
      };
    });

    project.details?.setValues({
      title: newProjectInfo.title,
      description: newProjectInfo.description,
      problem: newProjectInfo.problem,
      solution: newProjectInfo.solution,
      missionSummary: newProjectInfo.missionSummary,
      locationOfImpact: newProjectInfo.locationOfImpact,
      imageURL: "",
      links: linksArray,
      slug,
      tags: newProjectInfo.tags?.map((tag) => ({
        name: tag.name,
      })),
      businessModel: newProjectInfo.businessModel,
      stageIn: newProjectInfo.stageIn,
      raisedMoney: newProjectInfo.raisedMoney,
      pathToTake: newProjectInfo.pathToTake,
    });

    closeModal();

    const projectBefore = await gapIndexerApi
      .projectBySlug(project.uid)
      .then((res) => res.data);

    await project.details
      ?.attest(signer as any, changeStepperStep)
      .then(async () => {
        let retries = 1000;
        changeStepperStep("indexing");
        while (retries > 0) {
          // eslint-disable-next-line no-await-in-loop
          const fetchedProject = await gapIndexerApi
            .projectBySlug(project.uid)
            .then((res) => res.data);

          if (
            new Date(fetchedProject.details?.updatedAt) >
            new Date(projectBefore.details?.updatedAt)
          ) {
            retries = 0;
            changeStepperStep("indexed");
            closeModal();
            return;
          }
          retries -= 1;
          // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      });
    return project;
  } catch (error) {
    project.details?.setValues(oldProjectData);
    errorManager(`Error editing project: ${project.uid}`, error);
    throw error;
  }
};
