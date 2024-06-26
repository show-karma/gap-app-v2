import { getGapClient } from "@/hooks";
import { TxStepperSteps } from "@/store/txStepper";
import { appNetwork } from "@/utilities/network";
import {
  ExternalLink,
  Project,
  TExternalLink,
} from "@show-karma/karma-gap-sdk";
import { Hex, zeroHash } from "viem";

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

    await project.details
      ?.attest(signer as any, changeStepperStep)
      .then(async () => {
        let retries = 1000;
        let fetchedProject: Project | null = null;
        changeStepperStep("indexing");
        while (retries > 0) {
          // eslint-disable-next-line no-await-in-loop
          fetchedProject = await (slug
            ? gap.fetch.projectBySlug(slug)
            : gap.fetch.projectById(project.uid as Hex)
          ).catch(() => null);
          const compareAll = (a: any, b: any) => {
            return JSON.stringify(a) === JSON.stringify(b);
          };
          const newDetailsData = {
            title: newProjectInfo.title,
            description: newProjectInfo.description,
            links: linksArray,
            slug,
            tags: newProjectInfo.tags?.map((tag) => ({
              name: tag.name,
            })),
            businessModel: newProjectInfo.businessModel,
            stageIn: newProjectInfo.stageIn,
            raisedMoney: newProjectInfo.raisedMoney,
            pathToTake: newProjectInfo.pathToTake,
          };
          const fetchedDetailsData = {
            title: fetchedProject?.details?.title,
            description: fetchedProject?.details?.description,
            links: fetchedProject?.details?.links,
            slug: fetchedProject?.details?.slug,
            tags: fetchedProject?.details?.tags?.map((tag) => ({
              name: tag.name,
            })),
            businessModel: fetchedProject?.details?.businessModel,
            stageIn: fetchedProject?.details?.stageIn,
            raisedMoney: fetchedProject?.details?.raisedMoney,
            pathToTake: fetchedProject?.details?.pathToTake,
          };
          if (
            fetchedProject?.uid &&
            fetchedProject.uid !== zeroHash &&
            compareAll(newDetailsData, fetchedDetailsData)
          ) {
            retries = 0;
            changeStepperStep("indexed");
            setTimeout(() => {
              closeModal();
            }, 500);
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
    throw error;
  }
};
