export const MESSAGES = {
  PROJECT_FORM: {
    TITLE: "Title must be at least 3 characters",
    RECIPIENT: "Invalid address",
    TAGS: "Each category must be at least 3 characters",
    SOCIALS: {
      TWITTER: 'Twitter handle should not contain "@"',
    },
    MEMBERS: "Invalid address",
  },
  CATEGORIES: {
    ASSIGN_QUESTIONS: {
      EMPTY: `Please assign categories to grants before assigning review questions.`,
      SUCCESS: (categoryName: string) =>
        `Questions assigned successfully to ${categoryName}.`,
      ERROR: {
        GENERIC: (categoryName: string) =>
          `Questions could not be assigned to ${categoryName}.`,
        ALREADY_ANSWERED: (categoryName: string) =>
          `${categoryName} can't be changed because already have answers to it.`,
      },
    },
  },
  GRANT: {
    IMPACT_CRITERIA: {
      EMPTY: "The grantee has not defined any impact criteria yet.",
    },
    REVIEW: {
      EMPTY_REVIEWS: "No reviews yet, be the first to review this grant!",
      CAN_NOT_REVIEW: "This grant has not been configured for reviewing yet.",
      ALREADY_REVIEWED: "You have already reviewed this grant.",
      SUCCESS: (projectName: string, grantName: string) =>
        `Your review of ${projectName} - ${grantName} was succesfully saved.`,
      ERROR: (projectName: string, grantName: string) =>
        `Your review of ${projectName} - ${grantName} couldn't be saved.`,
      FORM: {
        RATING: "Rating is required",
        PLACEHOLDERS: {
          ANSWER: "Explain your rating (optional)",
        },
      },
    },
    MARK_AS_COMPLETE: {
      SUCCESS: "Grant completed successfully",
      ERROR: "There was an error doing the grant completion. Please try again",
    },
    CREATE: {
      SUCCESS: "Your grant was created successfully!",
      ERROR: "There was an error creating the grant. Please try again.",
    },
    FORM: {
      TITLE: `Title must be at least 3 characters`,
      LINK_TO_PROPOSAL: `This link must be a valid URL`,
      RECIPIENT: "Invalid address",
      COMMUNITY: "Community is required",
    },
    GRANT_UPDATE: {
      SUCCESS: "Update was successfully added to the grant.",
      ERROR: "There was an error creating the update. Please try again.",
    },
    UPDATE: {
      SUCCESS: "Your grant was edited successfully!",
      ERROR: "There was an error editing the grant. Please try again.",
      FORM: {
        TITLE: "Title must be at least 3 characters",
      },
    },
    DELETE: {
      SUCCESS: "Grant deleted successfully",
      ERROR: (title: string) =>
        `There was an error deleting ${title}. Please try again.`,
    },
  },
  MILESTONES: {
    FORM: {
      TITLE: "Title must be at least 3 characters",
      DATE: "Date is required",
    },
    DELETE: {
      SUCCESS: "Milestone deleted successfully",
      ERROR: (title: string) =>
        `There was an error deleting ${title}. Please try again.`,
    },
    REJECT: {
      SUCCESS: "Milestone has been rejected.",
      ERROR: "There was an error rejecting the milestone. Please try again.",
      UNDO: {
        SUCCESS: "Rejection successfully undone",
        ERROR: "There was an error undoing the rejection. Please try again",
      },
    },
    UPDATE_COMPLETION: {
      SUCCESS: "The milestone completion has been updated!",
      ERROR:
        "There was an error updating the milestone completion. Please try again.",
    },
    COMPLETE: {
      SUCCESS: "The milestone has been marked as complete!",
      ERROR:
        "There was an error marking the milestone as completed. Please try again.",
      UNDO: {
        SUCCESS: "Completion successfully removed",
        ERROR:
          "There was an error undoing the milestone completion. Please try again",
      },
    },
    CREATE: {
      SUCCESS: "Milestone was successfully added to the grant.",
      ERROR: "There was an error creating the milestone. Please try again.",
    },
    APPROVE: {
      SUCCESS: "You have successfully approved the milestone.",
      ERROR: "There was an error approving the milestone. Please try again.",
      UNDO: {
        SUCCESS: "Approval successfully undone",
        ERROR: "There was an error undoing the approval. Please try again.",
      },
    },
  },
  ADMIN: {
    NOT_AUTHORIZED: "You must be Admin of this Community to see this page.",
  },
  MY_PROJECTS: {
    NOT_CONNECTED: "Please login to view all your projects",
  },
  PROJECT: {
    CREATE: {
      SUCCESS: "Project created successfully, please create grants now",
      ERROR: "There was an error creating project. Please try again",
    },
    UPDATE: {
      SUCCESS: "Project updated successfully",
      ERROR: "There was an error updating project. Please try again",
    },
    DELETE: {
      SUCCESS: "Project deleted successfully",
      ERROR: "There was an error deleting project. Please try again",
    },
    REMOVE_MEMBER: {
      SUCCESS: "Member deleted successfully",
      ERROR: "There was an error deleting members. Please try again",
    },
    TRANSFER_OWNERSHIP: {
      SUCCESS: (newOwner: string) =>
        `Ownership transferred successfully to ${newOwner}. Updating our systems.`,
      ERROR: "There was an error transferring ownership. Please try again",
    },
    EMPTY: {
      GRANTS: {
        NOT_CREATED: `Check back in a few days and we’ll surely have something cool to
          show you :)`,
        NOT_CREATED_USER: `Once you’ve created a grant, this is where you can add milestones
          and updates to it`,
        UPDATES: `Grantee hasn't posted any updates for this grant.`,
        CTA_UPDATES: `But be sure to check back in.`,
        NOT_ADDED_MILESTONE: `Create a new milestone for forthcoming work, or post an update about the work you've already finished.`,
      },
    },
  },
  REVIEWS: {
    NOT_ADMIN: "You need to be an admin to see this page",
  },
};
