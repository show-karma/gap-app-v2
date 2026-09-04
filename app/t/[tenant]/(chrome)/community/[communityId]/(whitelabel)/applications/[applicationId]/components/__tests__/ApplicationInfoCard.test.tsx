import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ApplicationInfoCard } from "../ApplicationInfoCard";

// Clipboard hook is irrelevant to applicant visibility; stub it.
vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, vi.fn()],
}));

// The address-only branch renders the shared identity component (tested separately).
vi.mock("@/components/EthereumAddressToProfileName", () => ({
  default: ({ address }: { address?: string }) => <span>{address}</span>,
}));

const baseProps = {
  referenceNumber: "APP-9BLARDP8-560VRW",
  programName: "Filecoin ProPGF Batch 3",
  lastSubmission: "2026-07-07T00:00:00.000Z",
  deadline: "2026-06-16T00:00:00.000Z",
};

const ADDRESS = "0x1234567890123456789012345678901234567890";

describe("ApplicationInfoCard — applicant visibility", () => {
  it("hides the Applicant section for unauthorized viewers, even when identity data is present", () => {
    render(
      <ApplicationInfoCard
        {...baseProps}
        applicantEmail="applicant@example.com"
        ownerAddress={ADDRESS}
        canViewApplicant={false}
      />
    );

    expect(screen.queryByText("Applicant")).not.toBeInTheDocument();
    expect(screen.queryByText("applicant@example.com")).not.toBeInTheDocument();
  });

  it("never renders 'Anonymous' — hides the section when there is no identity", () => {
    render(
      <ApplicationInfoCard
        {...baseProps}
        applicantEmail=""
        ownerAddress=""
        canViewApplicant={true}
      />
    );

    expect(screen.queryByText("Applicant")).not.toBeInTheDocument();
    expect(screen.queryByText("Anonymous")).not.toBeInTheDocument();
  });

  it("shows the applicant email to authorized viewers", () => {
    render(
      <ApplicationInfoCard
        {...baseProps}
        applicantEmail="applicant@example.com"
        ownerAddress=""
        canViewApplicant={true}
      />
    );

    expect(screen.getByText("Applicant")).toBeInTheDocument();
    expect(screen.getByText("applicant@example.com")).toBeInTheDocument();
    // Name is the email local-part.
    expect(screen.getByText("applicant")).toBeInTheDocument();
  });

  it("resolves the applicant identity via the shared component when only ownerAddress is available", () => {
    render(
      <ApplicationInfoCard
        {...baseProps}
        applicantEmail=""
        ownerAddress={ADDRESS}
        canViewApplicant={true}
      />
    );

    expect(screen.getByText("Applicant")).toBeInTheDocument();
    expect(screen.getByText(ADDRESS)).toBeInTheDocument();
  });
});
