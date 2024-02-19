import { getGapClient } from "@/hooks";
import { appNetwork } from "@/utilities/network";
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
  },
  data: {
    twitter?: string;
    github?: string;
    discord?: string;
    website?: string;
    linkedin?: string;
  },
  signer: any
) => {
  try {
    const gap = getGapClient(appNetwork[0].id);
    if (!gap) return;
    const slug =
      project.details?.slug || (await gap.generateSlug(newProjectInfo.title));
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
    });

    await project.details?.attest(signer as any);
  } catch (error) {
    throw error;
  }
};
