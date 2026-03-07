import type { Application } from "@/types/whitelabel-entities";

export const getProjectTitle = (application: Application) => {
  const titleKeywords = ["title", "name"];
  const projectKeywords = ["project", "proposal", "application"];

  const dataKeys = Object.keys(application.applicationData || {});

  let titleKey = dataKeys.find((key) => {
    const lowerKey = key.toLowerCase();
    const hasProjectKeyword = projectKeywords.some((keyword) => lowerKey.includes(keyword));
    const hasTitleKeyword = titleKeywords.some((keyword) => lowerKey.includes(keyword));
    return hasProjectKeyword && hasTitleKeyword;
  });

  if (!titleKey) {
    titleKey = dataKeys.find((key) => {
      const lowerKey = key.toLowerCase();
      return titleKeywords.some((keyword) => lowerKey.includes(keyword));
    });
  }

  if (titleKey && application.applicationData[titleKey]) {
    return String(application.applicationData[titleKey]);
  }

  return application.referenceNumber;
};
