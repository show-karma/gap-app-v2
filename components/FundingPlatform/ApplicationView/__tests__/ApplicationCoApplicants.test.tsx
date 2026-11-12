import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationCoApplicants } from "../ApplicationCoApplicants";

const mockUseGranteeContacts = vi.fn();

vi.mock("@/hooks/useGranteeContacts", () => ({
  useGranteeContacts: (ref: string) => mockUseGranteeContacts(ref),
}));

const mockAccess = vi.fn();
const inviteGrantee = vi.fn();

vi.mock("@/src/features/applications/hooks/use-application-access", () => ({
  useApplicationAccess: () => mockAccess(),
}));

vi.mock("@/hooks/useInviteApplicationGrantee", () => ({
  useInviteApplicationGrantee: () => ({ inviteGrantee, isInviting: false }),
}));

const refetch = vi.fn();

function mockQuery(overrides: Record<string, unknown>) {
  mockUseGranteeContacts.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch,
    ...overrides,
  });
}

const owner = { kind: "applicant", role: "Owner", name: "Ana", email: "ana@x.org", address: "0x1" };

describe("ApplicationCoApplicants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccess.mockReturnValue({ isLoading: false, isOwner: false, canAdminister: false });
  });

  describe("loading", () => {
    it("renders a skeleton", () => {
      mockQuery({ isLoading: true });
      render(<ApplicationCoApplicants communityId="filecoin" referenceNumber="APP-1" />);
      expect(screen.getByLabelText("Loading co-applicants")).toBeInTheDocument();
    });
  });

  describe("success", () => {
    it("lists team members but not the applicant", () => {
      mockQuery({
        data: [
          owner,
          { kind: "member", role: "Member", name: "Bo", email: "bo@x.org", address: "0x2" },
        ],
      });
      render(<ApplicationCoApplicants communityId="filecoin" referenceNumber="APP-1" />);

      expect(mockUseGranteeContacts).toHaveBeenCalledWith("APP-1");
      expect(screen.getByText("Co-applicants")).toBeInTheDocument();
      expect(screen.getByText("Bo")).toBeInTheDocument();
      expect(screen.getByText("bo@x.org")).toBeInTheDocument();
      expect(screen.queryByText("Ana")).not.toBeInTheDocument();
    });

    it("shows each email once and drops members sharing the applicant's email", () => {
      mockQuery({
        data: [
          { kind: "member", role: "Member", name: "Ana B", email: "ANA@x.org", address: "0x2" },
          owner,
          { kind: "member", role: "Member", name: "Bo", email: "bo@x.org", address: "0x3" },
          { kind: "member", role: "Member", name: "Bo", email: "bo@x.org", address: "0x4" },
        ],
      });
      render(<ApplicationCoApplicants communityId="filecoin" referenceNumber="APP-1" />);

      expect(screen.getAllByRole("listitem")).toHaveLength(1);
      expect(screen.queryByText("Ana B")).not.toBeInTheDocument();
    });
  });

  describe("empty", () => {
    it("says none when only the applicant has access", () => {
      mockQuery({ data: [owner] });
      render(<ApplicationCoApplicants communityId="filecoin" referenceNumber="APP-1" />);
      expect(screen.getByText("None")).toBeInTheDocument();
    });
  });

  describe("error", () => {
    it("offers a retry", () => {
      mockQuery({ isError: true });
      render(<ApplicationCoApplicants communityId="filecoin" referenceNumber="APP-1" />);
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(refetch).toHaveBeenCalled();
    });
  });

  describe("add co-applicant", () => {
    it("is hidden from viewers who cannot manage the application", () => {
      mockQuery({ data: [owner] });
      render(<ApplicationCoApplicants communityId="filecoin" referenceNumber="APP-1" />);
      expect(screen.queryByRole("button", { name: /Add co-applicant/ })).not.toBeInTheDocument();
    });

    it("is hidden while access is resolving", () => {
      mockAccess.mockReturnValue({ isLoading: true, isOwner: false, canAdminister: true });
      mockQuery({ data: [owner] });
      render(<ApplicationCoApplicants communityId="filecoin" referenceNumber="APP-1" />);
      expect(screen.queryByRole("button", { name: /Add co-applicant/ })).not.toBeInTheDocument();
    });

    it("opens the add dialog for admins", () => {
      mockAccess.mockReturnValue({ isLoading: false, isOwner: false, canAdminister: true });
      mockQuery({ data: [owner] });
      render(<ApplicationCoApplicants communityId="filecoin" referenceNumber="APP-1" />);
      fireEvent.click(screen.getByRole("button", { name: /Add co-applicant/ }));
      expect(screen.getByRole("dialog", { name: "Add co-applicant" })).toBeInTheDocument();
    });
  });
});
