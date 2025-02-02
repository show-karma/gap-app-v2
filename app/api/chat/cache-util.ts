import {
  getCategoriesOfProject,
  getGrantsOfProject,
  getImpactsOfProject,
  getMembersOfProject,
  getMilestonesOfProject,
  getProject,
  getUpdatesOfProject,
} from "./util";

interface CachedData {
  data: string | null;
  timestamp: number;
}

interface CachedData {
  data: string | null;
  timestamp: number;
}

// Cache duration in milliseconds (5 minutes)
export const CACHE_DURATION = 5 * 60 * 1000;

// Track populated projects
const populatedProjects = new Set<string>();

// Cache stores for different data types
export const projectCache = new Map<string, CachedData>();
export const grantsCache = new Map<string, CachedData>();
export const impactsCache = new Map<string, CachedData>();
export const milestonesCache = new Map<string, CachedData>();
export const membersCache = new Map<string, CachedData>();
export const updatesCache = new Map<string, CachedData>();
export const categoriesCache = new Map<string, CachedData>();

export function getCachedData<T>(
  cache: Map<string, CachedData>,
  key: string,
  fetcher: () => Promise<T>,
  logPrefix: string
): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`[${logPrefix}] Cache hit for:`, key, cached.data);
    return cached.data as unknown as Promise<T>;
  }

  return fetcher().then((data) => {
    cache.set(key, {
      data: (Array.isArray(data) && data.length === 0
        ? null
        : JSON.stringify(data)) as string | null,
      timestamp: now,
    });
    return data;
  });
}

export function isPopulated(projectUid: string) {
  return populatedProjects.has(projectUid);
}

export function setPopulated(projectUid: string) {
  populatedProjects.add(projectUid);
}

export async function populateProjectData(project: { uid: string }) {
  const startTime = performance.now();
  console.log(`[Cache Population] Starting for project: ${project.uid}`);

  const projectData = await getProjectWithCache(project.uid);
  if (!projectData) {
    console.log(`[Cache Population] No project data found for: ${project.uid}`);
    return;
  }

  // Parse the project data once
  const parsedProjectData = JSON.parse(projectData);
  const now = Date.now();

  console.log(
    "[populateProjectData] Parsed project data for grants:",
    parsedProjectData.grants
  );

  const grants = await getGrantsOfProject(project.uid);
  if (grants) {
    // Format and cache all the related data from the project response
    grantsCache.set(project.uid, {
      data: grants,
      timestamp: now,
    });
  } else {
    console.log(
      "[populateProjectData] No grants found for project:",
      project.uid
    );
    grantsCache.set(project.uid, {
      data: null,
      timestamp: now,
    });
  }

  const impacts = await getImpactsOfProject(project.uid);
  if (impacts) {
    impactsCache.set(project.uid, {
      data: JSON.stringify(parsedProjectData.impacts),
      timestamp: now,
    });
  } else {
    console.log("[populateProjectData] No impacts found for project:", project.uid);
    impactsCache.set(project.uid, {
      data: null,
      timestamp: now,
    });
  }

  const milestones = await getMilestonesOfProject(project.uid);
  if (milestones) {
    milestonesCache.set(project.uid, {
      data: JSON.stringify(parsedProjectData.milestones),
      timestamp: now,
    });
  } else {
    console.log("[populateProjectData] No milestones found for project:", project.uid);
    milestonesCache.set(project.uid, {
      data: null,
      timestamp: now,
    });
  }

  const members = await getMembersOfProject(project.uid);
  if (members) {
    membersCache.set(project.uid, {
      data: JSON.stringify(parsedProjectData.members),
      timestamp: now,
    });
  } else {
    console.log("[populateProjectData] No members found for project:", project.uid);
    membersCache.set(project.uid, {
      data: null,
      timestamp: now,
    });
  }

  const categories = await getCategoriesOfProject(project.uid);
  if (categories) {
    categoriesCache.set(project.uid, {
      data: JSON.stringify(
        parsedProjectData.category?.map((c: { name: string }) => c.name)
      ),
      timestamp: now,
    });
  } else {
    console.log("[populateProjectData] No categories found for project:", project.uid);
    categoriesCache.set(project.uid, {
      data: null,
      timestamp: now,
    });
  }

  const updates = await getUpdatesOfProject(project.uid);
  if (updates) {
    updatesCache.set(project.uid, {
      data: JSON.stringify(parsedProjectData.updates),
      timestamp: now,
    });
  } else {
    console.log("[populateProjectData] No updates found for project:", project.uid);
    updatesCache.set(project.uid, {
      data: null,
      timestamp: now,
    });
  }

  const endTime = performance.now();
  console.log(
    `[Cache Population] Completed for project: ${project.uid}. Time taken: ${(
      endTime - startTime
    ).toFixed(2)}ms`
  );
}

export async function getProjectWithCache(projectUid: string) {
  return getCachedData(
    projectCache,
    projectUid,
    () => getProject(projectUid),
    "getProject"
  );
}

export async function getGrantsWithCache(projectUid: string) {
  return getCachedData(
    grantsCache,
    projectUid,
    () => getGrantsOfProject(projectUid),
    "getGrantsOfProject"
  );
}

export async function getImpactsWithCache(projectUid: string) {
  return getCachedData(
    impactsCache,
    projectUid,
    () => getImpactsOfProject(projectUid),
    "getImpactsOfProject"
  );
}

export async function getMilestonesWithCache(projectUid: string) {
  return getCachedData(
    milestonesCache,
    projectUid,
    () => getMilestonesOfProject(projectUid),
    "getMilestonesOfProject"
  );
}

export async function getMembersWithCache(projectUid: string) {
  return getCachedData(
    membersCache,
    projectUid,
    () => getMembersOfProject(projectUid),
    "getMembersOfProject"
  );
}

export async function getUpdatesWithCache(projectUid: string) {
  return getCachedData(
    updatesCache,
    projectUid,
    () => getUpdatesOfProject(projectUid),
    "getUpdatesOfProject"
  );
}

export async function getCategoriesWithCache(projectUid: string) {
  return getCachedData(
    categoriesCache,
    projectUid,
    () => getCategoriesOfProject(projectUid),
    "getCategoriesOfProject"
  );
}
