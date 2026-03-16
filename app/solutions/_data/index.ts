import { alternativesSolutions } from "./alternatives";
import { bestForSolutions } from "./best-for";
import { featureAdvancedSolutions } from "./feature-advanced";
import { featureCoreSolutions } from "./feature-core";
import { grantManagementForSolutions } from "./grant-management-for";
import { guidesSolutions } from "./guides";
import { industryWeb3Solutions } from "./industry-web3";
import { sizeBudgetSolutions } from "./size-budget";
import { softwareTypeSolutions } from "./software-type";
import type { SolutionPage } from "./types";
import { useCasesSolutions } from "./use-cases";

const allSolutions: SolutionPage[] = [
  ...featureCoreSolutions,
  ...featureAdvancedSolutions,
  ...bestForSolutions,
  ...grantManagementForSolutions,
  ...softwareTypeSolutions,
  ...alternativesSolutions,
  ...guidesSolutions,
  ...industryWeb3Solutions,
  ...useCasesSolutions,
  ...sizeBudgetSolutions,
];

const solutionsBySlug = new Map<string, SolutionPage>(allSolutions.map((s) => [s.slug, s]));

export function getAllSolutions(): SolutionPage[] {
  return allSolutions;
}

export function getSolutionBySlug(slug: string): SolutionPage | undefined {
  return solutionsBySlug.get(slug);
}

export function getAllSlugs(): string[] {
  return allSolutions.map((s) => s.slug);
}
