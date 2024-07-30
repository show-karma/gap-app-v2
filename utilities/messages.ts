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
  PROJECT_UPDATE_FORM: {
    TITLE: "Title must be at least 3 characters",
    TEXT: "Text must be at least 3 characters",
    SUCCESS: "Update was successfully added to the project.",
    ERROR: "There was an error creating the update. Please try again.",
    DELETE: {
      SUCCESS: "Update deleted successfully",
      ERROR: "There was an error deleting the update. Please try again",
    },
  },
  COMMUNITY_FORM: {
    TITLE: "Title must be at least 3 characters",
    IMAGE_URL: "ENTER a valid Image url",
    DESCRIPTION: "Enter a valid description",
    SLUG: "Slug  must be at least 3 characters",
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
      NOT_AUTHORIZED: "You are not authorized to review this grant.",
      EMPTY_REVIEWS: "No reviews yet, be the first to review this grant!",
      CAN_NOT_REVIEW: "This grant has not been configured for reviewing yet.",
      ALREADY_REVIEWED: "You have already reviewed this grant.",
      SUCCESS: (projectName: string, grantName: string) =>
        `Your review of ${projectName} - ${grantName} was succesfully saved.`,
      ANON_REVIEW_ALREADY_EXISTS: (projectName: string, grantName: string) =>
        `You have already submitted an anonymous review for ${projectName} - ${grantName}.`,
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
      DATE: "Date is required",
    },
    GRANT_UPDATE: {
      SUCCESS: "Update was successfully added to the grant.",
      ERROR: "There was an error creating the update. Please try again.",
      UNDO: {
        SUCCESS: "Grant Update successfully removed",
        ERROR: "There was an error undoing the grant update. Please try again",
      },
      VERIFY: {
        SUCCESS: "You have successfully verified the grant update.",
        ERROR:
          "There was an error verifying the grant update. Please try again.",
      },
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
    VERIFY: {
      SUCCESS: "You have successfully verified the milestone.",
      ERROR: "There was an error verifying the milestone. Please try again.",
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
    NOT_AUTHORIZED: (uid: string) =>
      `You must be Admin of this Community${
        uid ? `(${uid})` : ""
      } to see this page.`,
  },
  MY_PROJECTS: {
    NOT_CONNECTED: "Please login to view all your projects",
  },
  PROJECT: {
    INTRO: {
      EMAIL: "E-mail must be a valid email address",
      TELEGRAM: "Telegram handle must be at least 3 characters",
    },
    SUBSCRIPTION: {
      NAME: "Name must be at least 3 characters",
      EMAIL: "E-mail must be at least 3 characters",
    },
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
    IMPACT: {
      SUCCESS: "Impact added successfully",
      ERROR: "There was an error adding impact. Please try again",
      REMOVE: {
        SUCCESS: "Impact removed successfully",
        ERROR: "There was an error removing impact. Please try again",
      },
      FORM: {
        WORK: "Work is required",
        IMPACT: "Impact is required",
        DATE: "Date is required",
        PROOF: "Proof is required",
      },
      VERIFY: {
        SUCCESS: "You have successfully verified the milestone.",
        ERROR: "There was an error verifying the milestone. Please try again.",
      },
    },
    TRANSFER_OWNERSHIP: {
      SUCCESS: (newOwner: string) =>
        `Ownership transferred successfully to ${newOwner}. Updating our systems.`,
      ERROR: "There was an error transferring ownership. Please try again",
    },
    EMPTY: {
      IMPACTS: {
        NOT_CREATED: `Project owner is working on adding impact attestations. Check back in a few days :)`,
        NOT_CREATED_USER: `Create a new impact attestation to show the world the impact of your work!`,
      },
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
  REGISTRY: {
    FORM: {
      NAME: "Name must be at least 3 characters",
      DESCRIPTION: "Description must be at least 3 characters",
      BUDGET: "You need to specify a budget",
      AMOUNT_DISTRIBUTED: "You need to specify an amount distributed to date",
      GRANT_SIZE: "You need to specify a grant size",
      BOUNTIES: "You need to specify at least one bounty",
      HOW_MANY_APPLICANTS:
        "You need to specify how many applicants through the site",
      HOW_MANY_GRANTS_ISSUE: "You need to specify how many grants issued",
      LINKS_TO_DETAILS: "You need to specify links to details",
      START_DATE: "You need to specify a start date",
      END_DATE: "You need to specify an end date",
      MIN_GRANT_SIZE: "You need to specify a minimum grant size",
      MAX_GRANT_SIZE: "You need to specify a maximum grant size",
      GRANTS_TO_DATE: "You need to specify grants issued to date",
      NETWORKTOCREATE: "You need to select a network",
      CATEGORIES: "You need to specify at least one category",
      ECOSYSTEMS: "You need to specify at least one ecosystem",
      GRANT_TYPES: "You need to specify at least one grant type",
      NETWORKS: "You need to specify at least one network",
    },
  },
};
