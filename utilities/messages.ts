export const MESSAGES = {
  PROJECT_FORM: {
    TITLE: {
      MIN: "Title must be at least 3 characters",
      MAX: "Title must be less than 50 characters",
    },
    RECIPIENT: "Invalid address",
    TAGS: "Each category must be at least 3 characters",
    SOCIALS: {
      TWITTER: 'Twitter handle should not contain "@"',
    },
    MEMBERS: "Invalid address",
  },
  PROGRAM_REGISTRY: {
    CREATE: {
      ERROR: (title: string) => `There was an error creating ${title} program.`,
    },
    EDIT: {
      ERROR: (title: string) => `There was an error editing ${title} program.`,
    },
  },
  REQUEST_INTRO: {
    ERROR: "Something went wrong while requesting intro.",
  },
  AIRDROP_GITCOIN_SUPPORTERS: {
    MINT_NFT: {
      ERROR: "Error minting NFTs.",
    },
  },
  CATEGORY: {
    CREATE: {
      ERROR: "Something went wrong while creating the category.",
    },
    UPDATE: {
      ERROR: "Something went wrong while updating the category.",
    },
  },
  INDICATOR: {
    DELETE: {
      ERROR: "Something went wrong while deleting the indicator.",
    },
  },
  SUMUP_ADMIN: {
    ADD_TO_WHITELIST: {
      ERROR: "An error occurred while adding to the whitelist.",
      SUCCESS: "Successfully added to the whitelist.",
    },
  },
  ACTIVITY_OUTCOME: {
    CREATE: {
      SUCCESS: "Activity/outcome created successfully.",
      ERROR: "Something went wrong while creating the activity/outcome.",
    },
    DELETE: {
      SUCCESS: "Activity/outcome deleted successfully.",
      ERROR: "Something went wrong while deleting the activity/outcome.",
    },
    UPDATE: {
      SUCCESS: "Activity/outcome updated successfully.",
      ERROR: "Something went wrong while updating the activity/outcome.",
    },
  },
  PROJECT_POINTER_FORM: {
    SUCCESS: "Project was successfully merged.",
    ERROR: "There was an error merging the project.",
    DELETE: {
      SUCCESS: "Pointer deleted successfully",
      ERROR: "There was an error deleting the pointer.",
    },
  },
  PROJECT_UPDATE_FORM: {
    TITLE: {
      MIN: "Title must be at least 3 characters",
      MAX: "Title must be less than 50 characters",
    },
    TEXT: "Text must be at least 3 characters",
    SUCCESS: "Update was successfully added to the project.",
    ERROR: "There was an error creating the update.",
    DELETE: {
      LOADING: "Deleting update.",
      SUCCESS: "Update deleted successfully",
      ERROR: "There was an error deleting the update.",
    },
  },
  PROJECT_OBJECTIVE_FORM: {
    TITLE: {
      MIN: "Title must be at least 3 characters",
      MAX: "Title must be less than 50 characters",
    },
    TEXT: "Text must be at least 3 characters",
    SUCCESS: "Objective was successfully added to the project.",
    ERROR: "There was an error creating the objective.",
    COMPLETE: {
      SUCCESS: "Objective completed successfully",
      ERROR: "There was an error completing the objective.",
      DELETE: {
        LOADING: "Deleting objective completion.",
        SUCCESS: "Objective completion deleted successfully",
        ERROR: "There was an error deleting the objective completion.",
      },
    },
    EDIT: {
      SUCCESS: "Objective edited successfully",
      ERROR: "There was an error editing the objective.",
    },
    DELETE: {
      LOADING: "Deleting objective.",
      SUCCESS: "Objective deleted successfully",
      ERROR: "There was an error deleting the objective.",
    },
  },
  COMMUNITY_FORM: {
    TITLE: {
      MIN: "Title must be at least 3 characters",
      MAX: "Title must be less than 50 characters",
    },
    IMAGE_URL: "ENTER a valid Image url",
    DESCRIPTION: "Enter a valid description",
    SLUG: "Slug  must be at least 3 characters",
  },
  CATEGORIES: {
    OUTPUTS: {
      EMPTY: `Please assign outputs to grants.`,
      SUCCESS: (categoryName: string) =>
        `Outputs assigned successfully to ${categoryName}.`,
      ERROR: {
        GENERIC: (categoryName: string) =>
          `Outputs could not be assigned to ${categoryName}.`,
      },
    },
  },
  GRANT: {
    IMPACT_CRITERIA: {
      EMPTY: "The grantee has not defined any impact criteria yet.",
    },
    ADD_EXTERNAL_ID: {
      ERROR: "Error adding external ID",
    },
    OUTPUTS: {
      EMPTY: "There are not output metrics available for this grant.",
      EMPTY_DATAPOINTS: "No data points are available for this metric yet.",
      EMPTY_ALL: "There are not output metrics available yet.",
      VALUE_REQUIRED: "Value is required",
      SUCCESS: "Outputs sent successfully",
      ERROR: "There was an error sending the outputs.",
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
      ERROR: "There was an error doing the grant completion.",
    },
    CREATE: {
      SUCCESS: "Your grant was created successfully!",
      ERROR: (title: string) => `There was an error creating ${title} grant.`,
    },
    FORM: {
      TITLE: {
        MIN: "Title must be at least 1 characters",
        MAX: "Title must be less than 50 characters",
      },
      LINK_TO_PROPOSAL: `This link must be a valid URL`,
      RECIPIENT: "Invalid address",
      COMMUNITY: "Community is required",
      DATE: "Date is required",
    },
    GRANT_UPDATE: {
      SUCCESS: "Update was successfully added to the grant.",
      ERROR: "There was an error creating the update.",
      UNDO: {
        LOADING: "Undoing grant update.",
        SUCCESS: "Grant Update successfully removed",
        ERROR: "There was an error undoing the grant update.",
      },
      VERIFY: {
        SUCCESS: "You have successfully verified the grant update.",
        ERROR: "There was an error verifying the grant update.",
      },
    },
    UPDATE: {
      SUCCESS: "Your grant was edited successfully!",
      ERROR: "There was an error editing the grant",
      FORM: {
        TITLE: {
          MIN: "Title must be at least 3 characters",
          MAX: "Title must be less than 50 characters",
        },
        DESCRIPTION: "Description must be a valid text",
      },
    },
    DELETE: {
      LOADING: "Deleting grant.",
      SUCCESS: "Grant deleted successfully",
      ERROR: (title: string) => `There was an error deleting ${title}.`,
    },
  },
  MILESTONES: {
    FORM: {
      TITLE: {
        MIN: "Title must be at least 3 characters",
        MAX: "Title must be less than 50 characters",
      },
      DATE: "Date is required",
    },
    DELETE: {
      LOADING: "Deleting milestone.",
      SUCCESS: "Milestone deleted successfully",
      ERROR: (title: string) => `There was an error deleting ${title}`,
    },
    REJECT: {
      SUCCESS: "Milestone has been rejected.",
      ERROR: "There was an error rejecting the milestone.",
      UNDO: {
        SUCCESS: "Rejection successfully undone",
        ERROR: "There was an error undoing the rejection.",
      },
    },
    UPDATE_COMPLETION: {
      SUCCESS: "The milestone completion has been updated!",
      ERROR: "There was an error updating the milestone completion.",
    },
    COMPLETE: {
      LOADING: "Marking milestone as complete.",
      SUCCESS: "The milestone has been marked as complete!",
      ERROR: "There was an error marking the milestone as completed.",
      UNDO: {
        LOADING: "Undoing milestone completion.",
        SUCCESS: "Completion successfully removed",
        ERROR: "There was an error undoing the milestone completion.",
      },
    },
    CREATE: {
      SUCCESS: "Milestone was successfully added to the grant.",
      ERROR: (title: string) =>
        `There was an error creating ${title} milestone.`,
    },
    VERIFY: {
      SUCCESS: "You have successfully verified the milestone.",
      ERROR: "There was an error verifying the milestone.",
    },
    APPROVE: {
      SUCCESS: "You have successfully approved the milestone.",
      ERROR: "There was an error approving the milestone.",
      UNDO: {
        SUCCESS: "Approval successfully undone",
        ERROR: "There was an error undoing the approval.",
      },
    },
  },
  ADMIN: {
    NOT_AUTHORIZED: (uid: string) =>
      `You must be Admin of this Community${
        uid ? `(${uid})` : ""
      } to see this page.`,
    NO_COMMUNITIES: "You are not an admin of any community.",
  },
  MY_PROJECTS: {
    NOT_CONNECTED: "Please login to view all your projects",
  },
  PROJECT: {
    ALL_REPORT: {
      ERROR: "Something went wrong while fetching projects",
    },
    NOT_AUTHORIZED: "You are not authorized to see this page.",
    INTRO: {
      EMAIL: "E-mail must be a valid email address",
      TELEGRAM: "Telegram handle must be at least 3 characters",
      MESSAGE: "Enter your request message",
    },
    SUBSCRIPTION: {
      NAME: {
        MIN: "Name must be at least 3 characters",
        MAX: "Name must be less than 50 characters",
      },
      EMAIL: "E-mail must be at least 3 characters",
      ERROR: (projectName: string) =>
        `Something went wrong while subscribing to ${projectName}.`,
    },
    LINK_CONTRACT_ADDRESSES: {
      SUCCESS: "Contract addresses updated successfully",
      ERROR: "Something went wrong while updating contract addresses.",
    },
    LINK_GITHUB_REPOS: {
      SUCCESS: "GitHub repositories updated successfully",
      ERROR: "Something went wrong while updating GitHub repositories.",
    },
    LINK_DIVVI_ID: {
      SUCCESS: "Divvi ID updated successfully",
      ERROR: "Something went wrong while updating Divvi ID.",
    },
    LINK_OSO_PROFILE: {
      SUCCESS: "OSO profile IDs updated successfully",
      ERROR: "Something went wrong while updating OSO profile IDs.",
    },
    CREATE: {
      SUCCESS: "Project created successfully, please create grants now",
      ERROR: (title: string) => `There was an error creating ${title} project.`,
    },
    UPDATE: {
      SUCCESS: "Project updated successfully",
      ERROR: "There was an error updating project.",
    },
    DELETE: {
      SUCCESS: "Project deleted successfully",
      ERROR: "There was an error deleting project.",
    },
    REMOVE_MEMBER: {
      SUCCESS: "Member deleted successfully",
      ERROR: "There was an error deleting members.",
    },
    IMPACT_ANSWERS: {
      ERROR: "Something went wrong while loading impact data",
    },
    IMPACT: {
      SUCCESS: "Impact added successfully",
      ERROR: "There was an error adding impact.",
      REMOVE: {
        LOADING: "Removing impact.",
        SUCCESS: "Impact removed successfully",
        ERROR: "There was an error removing impact.",
      },
      FORM: {
        WORK: "Work is required",
        IMPACT: "Impact is required",
        DATE: "Date is required",
        PROOF: "Proof is required",
      },
      VERIFY: {
        SUCCESS: "You have successfully verified the milestone.",
        ERROR: "There was an error verifying the milestone.",
      },
    },
    TRANSFER_OWNERSHIP: {
      SUCCESS: (newOwner: string) =>
        `Ownership transferred successfully to ${newOwner}. Updating our systems.`,
      ERROR: "There was an error transferring ownership.",
    },
    EMPTY: {
      UPDATES: {
        NOT_CREATED: `Project owner is working on adding project activities. Check back in a few days :)`,
      },
      IMPACTS: {
        NOT_CREATED: `Project owner is working on adding impact attestations. Check back in a few days :)`,
        NOT_CREATED_USER: `Create a new impact attestation to show the world the impact of your work!`,
      },
      GRANTS: {
        NOT_CREATED: `Check back in a few days and we'll surely have something cool to
          show you :)`,
        NOT_CREATED_USER: `Once you've created a grant, this is where you can add milestones
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
      NAME: {
        MIN: "Name must be at least 3 characters",
        MAX: "Name must be less than 50 characters",
      },
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
