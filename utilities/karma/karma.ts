import { envVars } from "../enviromentVars";

export const karmaLinks = {
  website: "https://karmahq.xyz",
  githubSDK: "https://github.com/show-karma/karma-gap-sdk",
};

export const karmaAPI = {
  findDelegate: (dao: string, user: string) =>
    `${envVars.NEXT_PUBLIC_KARMA_API}/dao/find-delegate?dao=${dao}&user=${user}`,
};
