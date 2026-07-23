/**
 * Pre-defined page header content for each tab
 */
export const PAGE_HEADER_CONTENT = {
  programDetails: {
    title: "Program Details",
    description:
      "Configure the basic information about your funding program. This information is displayed publicly to potential applicants.",
  },
  applicationForm: {
    title: "Application Form",
    description:
      "Build the questions applicants will answer when applying to your program. Drag and drop to reorder fields, and mark fields as required or private.",
  },
  postApprovalForm: {
    title: "Post-Approval Form",
    description:
      "Collect additional information from approved applicants. This form is shown after an application is approved and can be used for KYC, payment details, or other follow-up information.",
  },
  reviewers: {
    title: "Reviewers",
    description:
      "Manage who can review applications for your program. Program reviewers can view and evaluate all applications. Milestone reviewers focus on project milestone submissions.",
  },
  emailPrivacy: {
    title: "Email & Privacy Settings",
    description:
      "Configure email notifications, customize approval/rejection templates, set privacy preferences, and manage application access controls.",
  },
  aiEvaluation: {
    title: "AI Evaluation",
    description:
      "Configure AI-powered evaluation to automatically score and analyze applications based on your criteria. This helps prioritize applications and provide consistent feedback.",
  },
} as const;
