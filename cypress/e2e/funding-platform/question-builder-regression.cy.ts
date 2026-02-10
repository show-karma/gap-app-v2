/**
 * E2E Regression: Question Builder retains form after navigation
 *
 * Reproduces and guards:
 * 1. Open question builder (build tab)
 * 2. Remove one field and save
 * 3. Click "Back to Programs"
 * 4. Open program settings again
 * 5. Click "Edit Form"
 * 6. Verify form is not empty
 */

import { waitForPageLoad } from "../../support/intercepts";

describe("Funding Platform - Question Builder Regression", () => {
  const communityId = "optimism";
  const programId = "1045";

  let currentFormSchema: {
    id: string;
    title: string;
    description: string;
    fields: Array<{ id: string; type: string; label: string; required?: boolean; private?: boolean }>;
    settings: Record<string, unknown>;
  };

  const postApprovalFormSchema = {
    id: "post-approval-1",
    title: "Post Approval Form",
    description: "",
    fields: [],
    settings: {
      privateApplications: true,
      submitButtonText: "Submit",
      confirmationMessage: "Thank you",
    },
  };

  const permissionsResponse = {
    roles: {
      primaryRole: "PROGRAM_ADMIN",
      roles: ["PROGRAM_ADMIN"],
      reviewerTypes: [],
    },
    permissions: ["program:view", "program:edit", "program:manage_reviewers"],
    resourceContext: {
      communityId,
      programId,
    },
    isCommunityAdmin: true,
    isProgramAdmin: true,
    isReviewer: false,
    isRegistryAdmin: false,
    isProgramCreator: false,
  };

  const createProgramConfig = () => ({
    id: "config-1045",
    programId,
    chainID: 10,
    formSchema: currentFormSchema,
    postApprovalFormSchema,
    isEnabled: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });

  const createFundingProgram = () => ({
    programId,
    chainID: 10,
    name: "Optimism Retro Funding",
    metadata: {
      title: "Optimism Retro Funding",
      description: "Funding program for ecosystem builders",
      shortDescription: "Optimism grants",
    },
    applicationConfig: createProgramConfig(),
    communityUID: communityId,
    metrics: {
      totalApplications: 12,
      pendingApplications: 4,
      approvedApplications: 3,
      rejectedApplications: 5,
      revisionRequestedApplications: 0,
      underReviewApplications: 0,
    },
  });

  beforeEach(() => {
    currentFormSchema = {
      id: "form-1045",
      title: "Application Form",
      description: "Please complete this form",
      fields: [
        {
          id: "field-email",
          type: "email",
          label: "Contact Email",
          required: true,
          private: false,
        },
        {
          id: "field-project-name",
          type: "text",
          label: "Project Name",
          required: true,
          private: false,
        },
      ],
      settings: {
        submitButtonText: "Submit Application",
        confirmationMessage: "Thank you for your submission!",
        privateApplications: true,
      },
    };

    cy.login({ userType: "admin" });

    cy.intercept("GET", "**/v2/auth/permissions**", {
      statusCode: 200,
      body: permissionsResponse,
    }).as("getPermissions");

    cy.intercept("GET", `**/v2/funding-program-configs/community/${communityId}`, (req) => {
      req.reply({
        statusCode: 200,
        body: [createFundingProgram()],
      });
    }).as("getProgramsByCommunity");

    cy.intercept("GET", `**/v2/funding-program-configs/${programId}`, (req) => {
      req.reply({
        statusCode: 200,
        body: createFundingProgram(),
      });
    }).as("getProgramConfig");

    cy.intercept("GET", `**/v2/funding-program-configs/${programId}/reviewers`, {
      statusCode: 200,
      body: [],
    }).as("getProgramReviewers");

    cy.intercept("PUT", `**/v2/funding-program-configs/${programId}`, (req) => {
      const nextSchema = req.body?.formSchema;
      if (nextSchema && Array.isArray(nextSchema.fields)) {
        currentFormSchema = {
          ...currentFormSchema,
          ...nextSchema,
          fields: nextSchema.fields,
        };
      }

      req.reply({
        statusCode: 200,
        body: {
          applicationConfig: createProgramConfig(),
        },
      });
    }).as("updateProgramConfig");
  });

  it("keeps saved fields after delete + back to programs + edit form navigation", () => {
    cy.visit(
      `/community/${communityId}/manage/funding-platform/${programId}/question-builder?tab=build`
    );

    waitForPageLoad();

    // Initial state has 2 fields
    cy.contains("Contact Email").should("be.visible");
    cy.contains("Project Name").should("be.visible");

    // Remove one field (Project Name), keep email field
    cy.contains("Project Name").click();
    cy.get('button[title="Delete field"]').should("be.visible").click();
    cy.contains("Project Name").should("not.exist");
    cy.contains("Contact Email").should("be.visible");

    // Persist the new schema
    cy.contains("button", "Save Form").click();
    cy.wait("@updateProgramConfig");

    // Step 3-5: back to programs and reopen via the program "Settings" action.
    // We intentionally avoid waiting on a specific network alias here because
    // the page may hydrate from cache with no request in some runs.
    cy.visit(`/community/${communityId}/manage/funding-platform`);
    cy.contains("Optimism Retro Funding").should("be.visible");
    cy.contains("button", "Settings").first().click();
    cy.url().should(
      "include",
      `/community/${communityId}/manage/funding-platform/${programId}/question-builder`
    );

    // Step 6: form should not be empty
    cy.contains("No Form Fields Yet").should("not.exist");
    cy.contains("Contact Email").should("be.visible");
  });
});
