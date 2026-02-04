/**
 * @file Tests for useProgramSetupProgress hook
 * @description Tests the setup progress calculation logic for funding programs
 */

import { renderHook } from "@testing-library/react";
import { useProgramSetupProgress } from "@/hooks/useProgramSetupProgress";

// Mock dependencies
jest.mock("@/hooks/useFundingPlatform", () => ({
  useProgramConfig: jest.fn(),
}));

jest.mock("@/hooks/useProgramReviewers", () => ({
  useProgramReviewers: jest.fn(),
}));

import { useProgramConfig } from "@/hooks/useFundingPlatform";
import { useProgramReviewers } from "@/hooks/useProgramReviewers";

const mockUseProgramConfig = useProgramConfig as jest.Mock;
const mockUseProgramReviewers = useProgramReviewers as jest.Mock;

describe("useProgramSetupProgress", () => {
  const communityId = "test-community";
  const programId = "program-123";

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock - loading state
    mockUseProgramConfig.mockReturnValue({
      config: null,
      isLoading: false,
    });
    mockUseProgramReviewers.mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  describe("loading state", () => {
    it("should return isLoading true when config is loading", () => {
      mockUseProgramConfig.mockReturnValue({
        config: null,
        isLoading: true,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      expect(result.current.isLoading).toBe(true);
    });

    it("should return isLoading true when reviewers are loading", () => {
      mockUseProgramReviewers.mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("steps calculation", () => {
    it("should return 7 steps", () => {
      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      expect(result.current.steps).toHaveLength(7);
    });

    it("should mark program-created as always completed", () => {
      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const createStep = result.current.steps.find((s) => s.id === "program-created");
      expect(createStep?.status).toBe("completed");
    });

    it("should mark application-form as pending when no fields configured", () => {
      mockUseProgramConfig.mockReturnValue({
        config: { formSchema: { fields: [] } },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const formStep = result.current.steps.find((s) => s.id === "application-form");
      expect(formStep?.status).toBe("pending");
    });

    it("should mark application-form as completed when fields are configured", () => {
      mockUseProgramConfig.mockReturnValue({
        config: { formSchema: { fields: [{ id: "field-1", type: "text", label: "Name" }] } },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const formStep = result.current.steps.find((s) => s.id === "application-form");
      expect(formStep?.status).toBe("completed");
    });

    it("should mark reviewers as pending when no reviewers added", () => {
      mockUseProgramReviewers.mockReturnValue({
        data: [],
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const reviewerStep = result.current.steps.find((s) => s.id === "reviewers");
      expect(reviewerStep?.status).toBe("pending");
    });

    it("should mark reviewers as completed when reviewers are added", () => {
      mockUseProgramReviewers.mockReturnValue({
        data: [{ publicAddress: "0x123", name: "Reviewer" }],
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const reviewerStep = result.current.steps.find((s) => s.id === "reviewers");
      expect(reviewerStep?.status).toBe("completed");
    });

    it("should mark program-contacts as pending when no emails configured", () => {
      mockUseProgramConfig.mockReturnValue({
        config: { formSchema: { settings: {} } },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const contactsStep = result.current.steps.find((s) => s.id === "program-contacts");
      expect(contactsStep?.status).toBe("pending");
      expect(contactsStep?.required).toBe(true);
    });

    it("should mark program-contacts as pending when only admin emails exist (no finance)", () => {
      mockUseProgramConfig.mockReturnValue({
        config: {
          formSchema: {
            settings: { adminEmails: ["admin@example.com"] },
          },
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const contactsStep = result.current.steps.find((s) => s.id === "program-contacts");
      expect(contactsStep?.status).toBe("pending");
    });

    it("should mark program-contacts as pending when only finance emails exist (no admin)", () => {
      mockUseProgramConfig.mockReturnValue({
        config: {
          formSchema: {
            settings: { financeEmails: ["finance@example.com"] },
          },
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const contactsStep = result.current.steps.find((s) => s.id === "program-contacts");
      expect(contactsStep?.status).toBe("pending");
    });

    it("should mark program-contacts as completed when both admin and finance emails exist", () => {
      mockUseProgramConfig.mockReturnValue({
        config: {
          formSchema: {
            settings: {
              adminEmails: ["admin@example.com"],
              financeEmails: ["finance@example.com"],
            },
          },
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const contactsStep = result.current.steps.find((s) => s.id === "program-contacts");
      expect(contactsStep?.status).toBe("completed");
    });

    it("should mark program-contacts as pending when emails arrays are empty", () => {
      mockUseProgramConfig.mockReturnValue({
        config: {
          formSchema: {
            settings: { adminEmails: [], financeEmails: [] },
          },
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const contactsStep = result.current.steps.find((s) => s.id === "program-contacts");
      expect(contactsStep?.status).toBe("pending");
    });

    it("should use correct actionLabel for program-contacts based on status", () => {
      // Pending state
      mockUseProgramConfig.mockReturnValue({
        config: { formSchema: { settings: {} } },
        isLoading: false,
      });

      const { result: pendingResult } = renderHook(() =>
        useProgramSetupProgress(communityId, programId)
      );
      const pendingStep = pendingResult.current.steps.find((s) => s.id === "program-contacts");
      expect(pendingStep?.actionLabel).toBe("Add Contacts");

      // Completed state
      mockUseProgramConfig.mockReturnValue({
        config: {
          formSchema: {
            settings: {
              adminEmails: ["admin@example.com"],
              financeEmails: ["finance@example.com"],
            },
          },
        },
        isLoading: false,
      });

      const { result: completedResult } = renderHook(() =>
        useProgramSetupProgress(communityId, programId)
      );
      const completedStep = completedResult.current.steps.find((s) => s.id === "program-contacts");
      expect(completedStep?.actionLabel).toBe("Manage Contacts");
    });

    it("should mark email-templates as pending when no custom templates", () => {
      mockUseProgramConfig.mockReturnValue({
        config: { formSchema: { settings: {} } },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const emailStep = result.current.steps.find((s) => s.id === "email-templates");
      expect(emailStep?.status).toBe("pending");
    });

    it("should mark email-templates as completed when custom templates exist", () => {
      mockUseProgramConfig.mockReturnValue({
        config: {
          formSchema: {
            settings: {
              approvalEmailTemplate: "Custom approval email",
            },
          },
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const emailStep = result.current.steps.find((s) => s.id === "email-templates");
      expect(emailStep?.status).toBe("completed");
    });

    it("should mark ai-config as pending when no AI config set", () => {
      mockUseProgramConfig.mockReturnValue({
        config: {},
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const aiStep = result.current.steps.find((s) => s.id === "ai-config");
      expect(aiStep?.status).toBe("pending");
    });

    it("should mark ai-config as completed when AI config exists", () => {
      mockUseProgramConfig.mockReturnValue({
        config: { systemPrompt: "You are an AI evaluator" },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const aiStep = result.current.steps.find((s) => s.id === "ai-config");
      expect(aiStep?.status).toBe("completed");
    });

    it("should mark enable-program as completed when program is enabled", () => {
      mockUseProgramConfig.mockReturnValue({
        config: { isEnabled: true },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const enableStep = result.current.steps.find((s) => s.id === "enable-program");
      expect(enableStep?.status).toBe("completed");
    });

    it("should mark enable-program as disabled when form is not configured", () => {
      mockUseProgramConfig.mockReturnValue({
        config: { formSchema: { fields: [] }, isEnabled: false },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const enableStep = result.current.steps.find((s) => s.id === "enable-program");
      expect(enableStep?.status).toBe("disabled");
    });

    it("should mark enable-program as pending when form is configured but not enabled", () => {
      mockUseProgramConfig.mockReturnValue({
        config: {
          formSchema: { fields: [{ id: "field-1", type: "text", label: "Name" }] },
          isEnabled: false,
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const enableStep = result.current.steps.find((s) => s.id === "enable-program");
      expect(enableStep?.status).toBe("pending");
    });
  });

  describe("progress calculation", () => {
    it("should calculate correct completedCount", () => {
      mockUseProgramConfig.mockReturnValue({
        config: {
          formSchema: {
            fields: [{ id: "field-1", type: "text", label: "Name" }],
            settings: {
              approvalEmailTemplate: "Custom",
              adminEmails: ["admin@test.com"],
              financeEmails: ["finance@test.com"],
            },
          },
          systemPrompt: "AI prompt",
          isEnabled: true,
        },
        isLoading: false,
      });
      mockUseProgramReviewers.mockReturnValue({
        data: [{ publicAddress: "0x123", name: "Reviewer" }],
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      // program-created (always), application-form, reviewers, program-contacts, email-templates, ai-config, enable-program
      expect(result.current.completedCount).toBe(7);
    });

    it("should calculate correct percentComplete", () => {
      // Only program-created is completed (1 out of 7)
      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      expect(result.current.percentComplete).toBe(14); // 1/7 = 14.29% rounded to 14%
    });

    it("should identify required steps correctly", () => {
      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const requiredSteps = result.current.steps.filter((s) => s.required);
      expect(requiredSteps).toHaveLength(4); // program-created, application-form, admin-contacts, enable-program
    });
  });

  describe("isReadyToEnable", () => {
    it("should be true when all required steps are completed (except enable)", () => {
      mockUseProgramConfig.mockReturnValue({
        config: {
          formSchema: {
            fields: [{ id: "field-1", type: "text", label: "Name" }],
            settings: {
              adminEmails: ["admin@example.com"],
              financeEmails: ["finance@example.com"],
            },
          },
          isEnabled: false,
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      expect(result.current.isReadyToEnable).toBe(true);
    });

    it("should be false when application form is not configured", () => {
      mockUseProgramConfig.mockReturnValue({
        config: { formSchema: { fields: [] } },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      expect(result.current.isReadyToEnable).toBe(false);
    });

    it("should be false when program contacts are not configured", () => {
      mockUseProgramConfig.mockReturnValue({
        config: {
          formSchema: {
            fields: [{ id: "field-1", type: "text", label: "Name" }],
            settings: {},
          },
          isEnabled: false,
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      expect(result.current.isReadyToEnable).toBe(false);
    });
  });

  describe("missingRequired", () => {
    it("should list missing required steps", () => {
      mockUseProgramConfig.mockReturnValue({
        config: { formSchema: { fields: [] }, isEnabled: false },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      expect(result.current.missingRequired).toContain("Build Application Form");
      expect(result.current.missingRequired).toContain("Enable Program");
      expect(result.current.missingRequired).toContain("Add Program Contacts");
    });

    it("should be empty when all required steps are completed", () => {
      mockUseProgramConfig.mockReturnValue({
        config: {
          formSchema: {
            fields: [{ id: "field-1", type: "text", label: "Name" }],
            settings: {
              adminEmails: ["admin@example.com"],
              financeEmails: ["finance@example.com"],
            },
          },
          isEnabled: true,
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      expect(result.current.missingRequired).toHaveLength(0);
    });
  });

  describe("href generation", () => {
    it("should generate correct URLs for each step", () => {
      const { result } = renderHook(() => useProgramSetupProgress(communityId, programId));

      const baseUrl = `/community/${communityId}/admin/funding-platform/${programId}`;

      expect(result.current.steps.find((s) => s.id === "program-created")?.href).toBe(
        `${baseUrl}/question-builder?tab=program-details`
      );
      expect(result.current.steps.find((s) => s.id === "application-form")?.href).toBe(
        `${baseUrl}/question-builder?tab=build`
      );
      expect(result.current.steps.find((s) => s.id === "reviewers")?.href).toBe(
        `${baseUrl}/question-builder?tab=reviewers`
      );
      expect(result.current.steps.find((s) => s.id === "program-contacts")?.href).toBe(
        `${baseUrl}/question-builder?tab=contacts`
      );
      expect(result.current.steps.find((s) => s.id === "email-templates")?.href).toBe(
        `${baseUrl}/question-builder?tab=settings`
      );
      expect(result.current.steps.find((s) => s.id === "ai-config")?.href).toBe(
        `${baseUrl}/question-builder?tab=ai-config`
      );
    });
  });
});
