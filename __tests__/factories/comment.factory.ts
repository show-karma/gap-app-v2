import type { ApplicationComment } from "@/types/funding-platform";
import { applyOverrides, type DeepPartial, randomAddress, seq } from "./utils";

// ─── Application Comment factory ───

export function createMockComment(overrides?: DeepPartial<ApplicationComment>): ApplicationComment {
  const n = seq();
  const now = new Date().toISOString();
  const defaults: ApplicationComment = {
    id: `comment-${n}`,
    applicationId: `app-${n}`,
    authorAddress: randomAddress(),
    authorRole: "admin",
    authorName: `Admin User ${n}`,
    content: `Review feedback on application submission #${n}. The technical approach is sound but budget justification needs more detail.`,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  return applyOverrides(defaults, overrides);
}

// ─── Role presets ───

export function adminComment(overrides?: DeepPartial<ApplicationComment>): ApplicationComment {
  return createMockComment({
    authorRole: "admin",
    content:
      "Application has been reviewed. Please address the feedback below before resubmission.",
    ...overrides,
  } as DeepPartial<ApplicationComment>);
}

export function reviewerComment(overrides?: DeepPartial<ApplicationComment>): ApplicationComment {
  return createMockComment({
    authorRole: "reviewer",
    content:
      "Technical evaluation complete. The proposed architecture aligns well with ecosystem standards.",
    ...overrides,
  } as DeepPartial<ApplicationComment>);
}

export function applicantComment(overrides?: DeepPartial<ApplicationComment>): ApplicationComment {
  return createMockComment({
    authorRole: "applicant",
    content:
      "Thank you for the feedback. We have updated the budget breakdown and added milestone details.",
    ...overrides,
  } as DeepPartial<ApplicationComment>);
}

export function deletedComment(overrides?: DeepPartial<ApplicationComment>): ApplicationComment {
  return createMockComment({
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy: randomAddress(),
    content: "[This comment has been removed]",
    ...overrides,
  } as DeepPartial<ApplicationComment>);
}

export function editedComment(overrides?: DeepPartial<ApplicationComment>): ApplicationComment {
  const createdAt = "2024-07-10T10:00:00Z";
  const editedAt = "2024-07-10T14:30:00Z";
  return createMockComment({
    content: "Updated review: After further analysis, the technical approach is approved.",
    editHistory: [
      {
        content: "Initial review: Technical approach needs clarification.",
        editedAt,
        editedBy: randomAddress(),
      },
    ],
    createdAt,
    updatedAt: editedAt,
    ...overrides,
  } as DeepPartial<ApplicationComment>);
}

// ─── List factory ───

export function createCommentThread(count: number, applicationId?: string): ApplicationComment[] {
  const appId = applicationId ?? `app-${seq()}`;
  return Array.from({ length: count }, (_, i) =>
    createMockComment({
      applicationId: appId,
      authorRole: i === 0 ? "applicant" : i % 2 === 0 ? "reviewer" : "admin",
    })
  );
}
