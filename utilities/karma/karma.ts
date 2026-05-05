import { envVars } from "../enviromentVars";

export const karmaLinks = {
  website: "https://gov.karmahq.xyz",
  githubSDK: "https://github.com/show-karma/karma-gap-sdk",
  skills: "https://github.com/show-karma/skills",
  apiDocs: "https://gapapi.karmahq.xyz/v2/docs",
  llmsTxt: "https://www.karmahq.xyz/llms.txt",
};

export const karmaAPI = {
  findDelegate: (dao: string, user: string) =>
    `${envVars.NEXT_PUBLIC_KARMA_API}/dao/find-delegate?dao=${dao}&user=${user}`,
};
