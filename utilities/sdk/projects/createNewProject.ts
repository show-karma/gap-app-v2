import { getGapClient } from "@/hooks";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { appNetwork } from "@/utilities/network";
import { PAGES } from "@/utilities/pages";
import {
  ExternalLink,
  IProjectDetails,
  MemberOf,
  Project,
  ProjectDetails,
  nullRef,
} from "@show-karma/karma-gap-sdk";
import { getWalletClient } from "@wagmi/core";
import toast from "react-hot-toast";
import { Hex, zeroHash } from "viem";

export interface NewProjectData extends IProjectDetails {
  // tags?: Tag[];
  members?: Hex[];
  links: ExternalLink;
  recipient?: string;
}

export const createNewProject = async (
  newProjectInfo: NewProjectData,
  project: Project,
  router: any,
  gap: any
) => {
  try {
    if (!gap) return;

    const slug = await gap.generateSlug(newProjectInfo.title);
    // eslint-disable-next-line no-param-reassign
    project.details = new ProjectDetails({
      data: {
        title: newProjectInfo.title,
        description: newProjectInfo.description,
        imageURL: "",
        links: newProjectInfo.links,
        slug,
        tags: newProjectInfo.tags?.map((tag) => ({
          name: tag.name,
        })),
      },
      refUID: project.uid,
      schema: gap.findSchema("ProjectDetails"),
      recipient: project.recipient,
      uid: nullRef,
    });

    if (newProjectInfo.tags) {
      // eslint-disable-next-line no-param-reassign
      project.details.tags = newProjectInfo.tags?.map((t) => ({
        name: t.name,
      }));
    }

    if (newProjectInfo.members) {
      // eslint-disable-next-line no-param-reassign
      project.members = newProjectInfo.members?.map(
        (member) =>
          new MemberOf({
            recipient: member,
            refUID: project.uid,
            schema: gap.findSchema("MemberOf"),
            uid: nullRef,
            data: {
              memberOf: true,
            },
          })
      );
    }

    const walletClient = await getWalletClient({
      chainId: project.chainID,
    });
    if (!walletClient) return;
    const walletSigner = await walletClientToSigner(walletClient);
    return await project.attest(walletSigner).then(async () => {
      let retries = 10;
      let fetchedProject: Project | null = null;
      while (retries > 0) {
        // eslint-disable-next-line no-await-in-loop
        fetchedProject = await (slug
          ? gap.fetch.projectBySlug(slug)
          : gap.fetch.projectById(project.uid as Hex)
        ).catch(() => null);
        if (fetchedProject?.uid && fetchedProject.uid !== zeroHash) {
          retries = 0;
          toast.success(MESSAGES.PROJECT.CREATE.SUCCESS);
          router.push(PAGES.PROJECT.GRANTS(slug || project.uid));
          return;
        }
        retries -= 1;
        // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      toast.success(MESSAGES.PROJECT.CREATE.SUCCESS);
      router.push(PAGES.MY_PROJECTS);
    });
  } catch (error: any) {
    throw new Error(error);
  }
};
