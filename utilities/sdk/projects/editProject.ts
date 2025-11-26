import type {
  ExternalCustomLink,
  ExternalLink,
  GAP,
  Project,
  SignerOrProvider,
  TExternalLink,
} from "@show-karma/karma-gap-sdk";
import { errorManager } from "@/components/Utilities/errorManager";
import { queryClient } from "@/components/Utilities/PrivyProviderWrapper";
import type { TxStepperSteps } from "@/store/modals/txStepper";
import fetchData from "@/utilities/fetchData";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { INDEXER } from "@/utilities/indexer";

function _getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

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
    imageURL?: string;
  },
  data: {
    twitter?: string;
    github?: string;
    discord?: string;
    website?: string;
    linkedin?: string;
    pitchDeck?: string;
    demoVideo?: string;
    farcaster?: string;
    customLinks?: Array<{
      id: string;
      name: string;
      url: string;
    }>;
  },
  signer: SignerOrProvider,
  gap: GAP,
  changeStepperStep: (step: TxStepperSteps) => void,
  closeModal: () => void
) => {
  const oldProjectData = JSON.parse(JSON.stringify(project.details?.data));
  try {
    let slug = project.details?.slug || (await gap.generateSlug(newProjectInfo.title));
    if (project.details?.title?.toLowerCase() !== newProjectInfo.title?.toLowerCase()) {
      slug = await gap.generateSlug(newProjectInfo.title);
    }

    const linkKeys = Object.keys(data).filter((key) => key !== "customLinks") as Array<
      keyof Omit<typeof data, "customLinks">
    >;

    const linksArray: Array<ExternalLink[0] | ExternalCustomLink> = [
      ...linkKeys.map((key) => {
        return {
          url: data[key] || "",
          type: key as TExternalLink,
        };
      }),
      ...(data.customLinks?.map((link) => ({
        type: "custom" as const,
        name: link.name.trim(),
        url: link.url.trim(),
      })) || []),
    ];

    project.details?.setValues({
      title: newProjectInfo.title,
      description: newProjectInfo.description,
      problem: newProjectInfo.problem,
      solution: newProjectInfo.solution,
      missionSummary: newProjectInfo.missionSummary,
      locationOfImpact: newProjectInfo.locationOfImpact,
      imageURL: newProjectInfo.imageURL || "",
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

    const projectBefore = await gapIndexerApi.projectBySlug(project.uid).then((res) => res.data);

    await project.details?.attest(signer, changeStepperStep).then(async (res) => {
      let retries = 1000;
      changeStepperStep("indexing");
      const txHash = res?.tx[0]?.hash;
      if (txHash) {
        await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, project.chainID), "POST", {});
      }
      while (retries > 0) {
        // eslint-disable-next-line no-await-in-loop
        const fetchedProject = await gapIndexerApi
          .projectBySlug(project.uid)
          .then((res) => res.data);
        if (fetchedProject.details?.uid !== projectBefore.details?.uid) {
          retries = 0;
          changeStepperStep("indexed");

          // Invalidate React Query cache to force refresh of project data
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ["project", project.uid],
            }),
            queryClient.invalidateQueries({
              queryKey: ["project", project.details?.slug],
            }),
          ]);

          closeModal();
          return;
        }
        retries -= 1;
        // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    });
    return project;
  } catch (error: unknown) {
    project.details?.setValues(oldProjectData);
    errorManager(`Error editing project: ${project.uid}`, error);
    throw error;
  }
};
