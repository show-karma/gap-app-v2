import type { ReactNode } from "react";

export const additionalQuestion = (id?: number | string, query?: string) => {
  if (!id) return false;
  const generalIds =
    process.env.NEXT_PUBLIC_ENV === "production"
      ? ["00000004b48822456c5d7ab8", 4, "4"]
      : [6, "6"];
  const hasAdditional =
    query?.toLowerCase().includes("additional") ||
    query?.toLowerCase().includes("addtional");
  if (hasAdditional) return true;
  return generalIds.includes(+id);
};

export const votingPowerCommunities = ["Arb", "Arbitrum"];

export const specificCategoriesAndQuestions: Record<string, ReactNode> = {
  "PL - Arbitrum Citizen": (
    <>
      <p>
        {`The purpose of the review is to evaluate the extent to which the
  contributions of grantees have aligned with and advanced the
  DAO's mission of spearheading the evolution of decentralized
  technologies and governance.`}
      </p>
      <p>
        {`This review aims to assess the impact, relevance, and
  effectiveness of the grantees' past work in supporting the DAO's
  objectives, ensuring that the retroactive funding recognizes and
  encourages meaningful and impactful contributions within the DAO
  ecosystem.`}
      </p>
    </>
  ),
};