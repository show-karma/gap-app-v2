interface ApplicationWithData {
  applicationData: Record<string, unknown>;
  referenceNumber: string;
}

// Title/name fields are short labels (e.g. "Project Title", "Pod Name"),
// not long-form questions that incidentally contain keywords like "name".
const MAX_LABEL_LENGTH = 50;

export const findProjectTitleInData = (
  applicationData: Record<string, unknown> | null | undefined
): string | undefined => {
  const titleKeywords = ["title", "name"];
  const projectKeywords = ["project", "proposal", "application"];

  const data = applicationData || {};
  const dataKeys = Object.keys(data);
  if (dataKeys.length === 0) return undefined;

  const findBest = (predicate: (lowerKey: string) => boolean): string | undefined => {
    const matches = dataKeys.filter(
      (key) => key.length <= MAX_LABEL_LENGTH && predicate(key.toLowerCase()) && data[key]
    );
    if (matches.length === 0) return undefined;
    return matches.reduce((a, b) => (a.length <= b.length ? a : b));
  };

  // First priority: keys containing both a project keyword and a title/name keyword
  let titleKey = findBest((lowerKey) => {
    const hasProjectKeyword = projectKeywords.some((kw) => lowerKey.includes(kw));
    const hasTitleKeyword = titleKeywords.some((kw) => lowerKey.includes(kw));
    return hasProjectKeyword && hasTitleKeyword;
  });

  // Second priority: keys containing just title or name
  if (!titleKey) {
    titleKey = findBest((lowerKey) => titleKeywords.some((kw) => lowerKey.includes(kw)));
  }

  if (titleKey && data[titleKey]) {
    return String(data[titleKey]);
  }

  return undefined;
};

export const getProjectTitle = (application: ApplicationWithData): string => {
  return findProjectTitleInData(application.applicationData) ?? application.referenceNumber;
};
