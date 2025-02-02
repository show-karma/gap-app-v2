import axios from "axios";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

export async function getProjectsUsingEmbeddings(
  query: string,
  projectsInProgram: { uid: string; chainId: number }[] | undefined
) {
  console.log("[getProjectsUsingEmbeddings] Input:", {
    query,
    projectsInProgram,
  });
  const startTime = performance.now();
  try {
    const { data } = await axios.post<{ projects: any[] }>(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/projects/by-embeddings`,
      {
        projectsInProgram,
        query,
      }
    );
    const endTime = performance.now();
    console.log(
      "[getProjectsUsingEmbeddings] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    console.log("[getProjectsUsingEmbeddings] Response:", data);
    return JSON.stringify(data);
  } catch (error) {
    const endTime = performance.now();
    console.error("[getProjectsUsingEmbeddings] Error:", error);
    console.log(
      "[getProjectsUsingEmbeddings] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    return null;
  }
}

export async function getGrantsOfProject(projectUid: string) {
  console.log("[getGrantsOfProject] Input:", { projectUid });
  const startTime = performance.now();
  try {
    const { data } = await axios.get<IProjectResponse>(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    const endTime = performance.now();
    console.log(
      "[getGrantsOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    const result = data.grants?.map((grant) => ({
      ...grant?.details?.data,
    }));
    console.log("[getGrantsOfProject] Response:", result);
    return JSON.stringify(result);
  } catch (error) {
    const endTime = performance.now();
    console.error("[getGrantsOfProject] Error:", error);
    console.log(
      "[getGrantsOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    return null;
  }
}

export async function getImpactsOfProject(projectUid: string) {
  console.log("[getImpactsOfProject] Input:", { projectUid });
  const startTime = performance.now();
  try {
    const { data } = await axios.get<IProjectResponse>(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    const endTime = performance.now();
    console.log(
      "[getImpactsOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    const result = data.impacts?.map((impact) => ({
      ...impact?.data,
      createdAt: impact?.createdAt,
    }));
    console.log("[getImpactsOfProject] Response:", result);
    return JSON.stringify(result);
  } catch (error) {
    const endTime = performance.now();
    console.error("[getImpactsOfProject] Error:", error);
    console.log(
      "[getImpactsOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    return null;
  }
}

export async function getMilestonesOfProject(projectUid: string) {
  console.log("[getMilestonesOfProject] Input:", { projectUid });
  const startTime = performance.now();
  try {
    const { data } = await axios.get<IProjectResponse>(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    const endTime = performance.now();
    console.log(
      "[getMilestonesOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    const result = data.milestones?.map((milestone) => ({
      ...milestone?.data,
      createdAt: milestone?.createdAt,
    }));
    console.log("[getMilestonesOfProject] Response:", result);
    return JSON.stringify(result);
  } catch (error) {
    const endTime = performance.now();
    console.error("[getMilestonesOfProject] Error:", error);
    console.log(
      "[getMilestonesOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    return null;
  }
}

export async function getMembersOfProject(projectUid: string) {
  console.log("[getMembersOfProject] Input:", { projectUid });
  const startTime = performance.now();
  try {
    const { data } = await axios.get<IProjectResponse>(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    const endTime = performance.now();
    console.log(
      "[getMembersOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    const result = data.members?.map((member) => member?.recipient);
    console.log("[getMembersOfProject] Response:", result);
    return JSON.stringify(result);
  } catch (error) {
    const endTime = performance.now();
    console.error("[getMembersOfProject] Error:", error);
    console.log(
      "[getMembersOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    return null;
  }
}

export async function getUpdatesOfProject(projectUid: string) {
  console.log("[getUpdatesOfProject] Input:", { projectUid });
  const startTime = performance.now();
  try {
    const { data } = await axios.get(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    const endTime = performance.now();
    console.log(
      "[getUpdatesOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    const result = data.updates?.map((update: any) => ({
      ...update?.data,
      createdAt: update?.createdAt,
    }));
    console.log("[getUpdatesOfProject] Response:", result);
    return JSON.stringify(result);
  } catch (error) {
    const endTime = performance.now();
    console.error("[getUpdatesOfProject] Error:", error);
    console.log(
      "[getUpdatesOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    return null;
  }
}

export async function getCategoriesOfProject(projectUid: string) {
  console.log("[getCategoriesOfProject] Input:", { projectUid });
  const startTime = performance.now();
  try {
    const { data } = await axios.get<
      IProjectResponse & { category: { name: string }[] }
    >(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    const endTime = performance.now();
    console.log(
      "[getCategoriesOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    const result = data.category?.map((category) => category.name);
    console.log("[getCategoriesOfProject] Response:", result);
    return JSON.stringify(result);
  } catch (error) {
    const endTime = performance.now();
    console.error("[getCategoriesOfProject] Error:", error);
    console.log(
      "[getCategoriesOfProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    return null;
  }
}

export async function getProject(projectUid: string) {
  console.log("[getProject] Input:", { projectUid });
  const startTime = performance.now();
  try {
    const { data } = await axios.get<
      IProjectResponse & {
        category: { name: string }[];
        project_milestones: any[];
      }
    >(
      `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.PROJECT.GET(projectUid)}`
    );
    const endTime = performance.now();
    console.log(
      "[getProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );

    console.log("[getProject] Response:", data);


    const impacts = data.impacts?.map((impact) => ({
      ...impact?.data,
      // createdAt: impact?.createdAt,
    }));
    const milestones = data.project_milestones?.map((milestone) => ({
      ...milestone?.data,
      // createdAt: milestone?.createdAt,
    }));
    const members = data.members?.map((member) => member?.recipient);
    const updates = data.updates?.map((update: any) => ({
      ...update?.data,
      // createdAt: update?.createdAt,
    }));
    const grants = data.grants?.map((grant) => ({
      ...grant?.details?.data,
      // createdAt: grant?.createdAt,
    }));
    const project = {
      uid: data.uid,
      // createdAt: data.createdAt,
      // createdBy: data.recipient,
      category: data?.category,
      details: data?.details?.data,
      grants,
      impacts,
      milestones,
      members,
      updates,
    };

    console.log("[getProject] Processed response:", project);
    return JSON.stringify(project);
  } catch (error) {
    const endTime = performance.now();
    console.error("[getProject] Error:", error);
    console.log(
      "[getProject] Time taken:",
      `${(endTime - startTime).toFixed(2)}ms`
    );
    return null;
  }
}

export async function getCategoriesInProgram(
  projectsInProgram: {
    uid: string;
    chainId: number;
    projectCategories: string[];
  }[]
) {
  const categories = projectsInProgram.flatMap(
    (project) => project.projectCategories
  );
  return JSON.stringify(categories);
}
