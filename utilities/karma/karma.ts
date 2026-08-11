import { CANONICAL_ORIGIN, GOV_HOST } from "@/utilities/domains";
import { envVars } from "../enviromentVars";

export const karmaLinks = {
  website: `https://${GOV_HOST}`,
  githubSDK: "https://github.com/show-karma/karma-gap-sdk",
  skills: "https://github.com/show-karma/skills",
  apiDocs: "https://gapapi.karmahq.xyz/v2/docs",
  llmsTxt: `${CANONICAL_ORIGIN}/llms.txt`,
};

export const karmaAPI = {
  findDelegate: (dao: string, user: string) =>
    `${envVars.NEXT_PUBLIC_KARMA_API}/dao/find-delegate?dao=${dao}&user=${user}`,
};
