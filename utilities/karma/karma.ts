import { envVars } from "../enviromentVars";

export const karmaLinks = {
  website: "https://karmahq.xyz",
  githubSDK: "https://github.com/show-karma/karma-gap-sdk",
  apiDocs: "https://documenter.getpostman.com/view/36647319/2sAXxQdrkZ",
  termsAndConditions:
    "https://docs.google.com/document/d/13hIVsLnwJBm2mhSuh8E-e4AXErs8IQzKt4V-wDskDg4/edit?tab=t.0",
  privacyPolicy:
    "https://docs.google.com/document/u/1/d/1JVg13RknY4D6FtjxrG2t4U5B5IrUouF95-SMcrmDQKI/edit?tab=t.0",
};

export const karmaAPI = {
  findDelegate: (dao: string, user: string) =>
    `${envVars.NEXT_PUBLIC_KARMA_API}/dao/find-delegate?dao=${dao}&user=${user}`,
};
