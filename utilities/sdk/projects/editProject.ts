import type {
  ExternalCustomLink,
  ExternalLink,
  GAP,
  Project,
  SignerOrProvider,
  TExternalLink,
} from "@show-karma/karma-gap-sdk";
import { errorManager } from "@/components/Utilities/errorManager";
import type { AttestationStep } from "@/hooks/useAttestationToast";
import { checkSlugExists, getProject } from "@/services/project.service";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { refreshProjectQueries } from "@/utilities/queries/refreshProjectQueries";
import { queryClient } from "@/utilities/query-client";

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
  changeStepperStep: (step: AttestationStep) => void,
  closeModal: () => void,
  setIsStepper: (value: boolean) => void,
  startAttestation: (message: string) => void,
  showSuccess: (message: string) => void
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

    const projectBefore = await getProject(project.uid);

    startAttestation("Updating project...");
    await project.details?.attest(signer, changeStepperStep).then(async (res) => {
      let retries = 1000;
      changeStepperStep("indexing");
      const txHash = res?.tx[0]?.hash;
      if (txHash) {
        try {
          // Fire-and-forget: the polling loop below is the source of truth
          // for indexing completion, so a failure here shouldn't abort the
          // update flow.
          await api.post(INDEXER.ATTESTATION_LISTENER(txHash, project.chainID), {});
        } catch (notifyError: unknown) {
          errorManager(
            `Error notifying attestation listener for project ${project.uid}`,
            notifyError
          );
        }
      }

      // Poll using checkSlugExists first to avoid potential 404 errors in Sentry
      const projectIdentifier = project.details?.slug || project.uid;
      while (retries > 0) {
        // eslint-disable-next-line no-await-in-loop
        const exists = await checkSlugExists(projectIdentifier);
        if (exists) {
          // eslint-disable-next-line no-await-in-loop
          const fetchedProject = await getProject(project.uid);
          // The indexer stamps `details.lastDetailsUpdate` only when the details
          // themselves change. Comparing it with the top-level `updatedAt` (as
          // this used to) passes before indexing whenever something else — a
          // member or ownership change — last moved `updatedAt`, and the
          // unchanged project was then reported, and cached, as the edit.
          const lastDetailsUpdate = fetchedProject?.details?.lastDetailsUpdate;
          if (
            fetchedProject &&
            lastDetailsUpdate &&
            lastDetailsUpdate !== projectBefore?.details?.lastDetailsUpdate
          ) {
            changeStepperStep("indexed");
            showSuccess("Project updated successfully!");

            // Write the indexed project straight into the cache. Invalidation
            // cannot reach the profile's statically-observed queries, and
            // `project.details.slug` already holds the NEW slug here, so the
            // old-slug page is found through the uid.
            await refreshProjectQueries(queryClient, {
              identifiers: [project.uid, project.details?.slug],
              project: fetchedProject,
              families: ["project"],
            });

            closeModal();
            return;
          }
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
  } finally {
    setIsStepper(false);
  }
};
