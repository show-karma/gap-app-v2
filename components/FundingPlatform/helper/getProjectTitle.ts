import type { IFundingApplication } from "@/types/funding-platform";

export const getProjectTitle = (application: IFundingApplication) => {
  // Search for project name/title field in applicationData using contains approach
  const titleKeywords = ["title", "name"];
  const projectKeywords = ["project", "proposal", "application"];

  // Get all keys from applicationData
  const dataKeys = Object.keys(application.applicationData || {});

  // First priority: Find keys that contain both project-related and title/name keywords
  let titleKey = dataKeys.find((key) => {
    const lowerKey = key.toLowerCase();
    const hasProjectKeyword = projectKeywords.some((keyword) => lowerKey.includes(keyword));
    const hasTitleKeyword = titleKeywords.some((keyword) => lowerKey.includes(keyword));
    return hasProjectKeyword && hasTitleKeyword;
  });

  // Second priority: Find keys that contain just title or name
  if (!titleKey) {
    titleKey = dataKeys.find((key) => {
      const lowerKey = key.toLowerCase();
      return titleKeywords.some((keyword) => lowerKey.includes(keyword));
    });
  }

  // Return the value if found, otherwise fallback to Application ID
  if (titleKey && application.applicationData[titleKey]) {
    return application.applicationData[titleKey];
  }

  return application.referenceNumber;
};
