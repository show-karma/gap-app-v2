import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationCoApplicantsSection } from "../ApplicationCoApplicantsSection";

const mockContacts = vi.fn();
const mockAccess = vi.fn();
const refetch = vi.fn();

vi.mock("@/hooks/useGranteeContacts", () => ({
  useGranteeContacts: () => mockContacts(),
}));
vi.mock("@/src/features/applications/hooks/use-application-access", () => ({
  useApplicationAccess: () => mockAccess(),
}));
vi.mock("@/hooks/useInviteApplicationGrantee", () => ({
  useInviteApplicationGrantee: () => ({ inviteGrantee: vi.fn(), isInviting: false }),
}));

const owner = { kind: "applicant", role: "Owner", name: "Ana", email: "ana@x.org", address: "0x1" };
const member = { kind: "member", role: "Member", name: "Bo", email: "bo@x.org", address: "0x2" };

function mockQuery(overrides: Record<string, unknown>) {
  mockContacts.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch,
    ...overrides,
  });
}

function renderSection() {
  return render(<ApplicationCoApplicantsSection communityId="filecoin" referenceNumber="APP-1" />);
}

describe("ApplicationCoApplicantsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccess.mockReturnValue({ isLoading: false, isOwner: false, canAdminister: false });
  });

  describe("loading", () => {
    it("renders a skeleton", () => {
      mockQuery({ isLoading: true });
      renderSection();
      expect(screen.getByLabelText("Loading co-applicants")).toBeInTheDocument();
    });
  });

  describe("success", () => {
    it("lists co-applicants without the applicant", () => {
      mockQuery({ data: [owner, member] });
      renderSection();
      expect(screen.getByText("Bo")).toBeInTheDocument();
      expect(screen.getByText("bo@x.org")).toBeInTheDocument();
      expect(screen.queryByText("Ana")).not.toBeInTheDocument();
    });
  });

  describe("empty", () => {
    it("says none to co-applicants", () => {
      mockQuery({ data: [owner] });
      renderSection();
      expect(screen.getByText("None")).toBeInTheDocument();
    });

    it("prompts the owner to add teammates", () => {
      mockAccess.mockReturnValue({ isLoading: false, isOwner: true, canAdminister: false });
      mockQuery({ data: [owner] });
      renderSection();
      expect(screen.getByText(/No co-applicants yet/)).toBeInTheDocument();
    });
  });

  describe("error", () => {
    it("offers a retry", () => {
      mockQuery({ isError: true });
      renderSection();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(refetch).toHaveBeenCalled();
    });
  });

  describe("add co-applicant", () => {
    it("is hidden from co-applicants", () => {
      mockQuery({ data: [owner, member] });
      renderSection();
      expect(screen.queryByRole("button", { name: /Add co-applicant/ })).not.toBeInTheDocument();
    });

    it("opens the add dialog for the owner", () => {
      mockAccess.mockReturnValue({ isLoading: false, isOwner: true, canAdminister: false });
      mockQuery({ data: [owner] });
      renderSection();
      fireEvent.click(screen.getByRole("button", { name: /Add co-applicant/ }));
      expect(screen.getByRole("dialog", { name: "Add co-applicant" })).toBeInTheDocument();
    });
  });
});
