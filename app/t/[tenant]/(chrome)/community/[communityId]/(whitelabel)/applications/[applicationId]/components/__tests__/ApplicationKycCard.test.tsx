import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { KycVerificationStatus } from "@/types/kyc";
import { ApplicationKycCard } from "../ApplicationKycCard";

const mockUseKycConfig = vi.fn();
const mockUseKycStatus = vi.fn();

vi.mock("@/hooks/useKycStatus", () => ({
  useKycConfig: (...args: unknown[]) => mockUseKycConfig(...args),
  useKycStatus: (...args: unknown[]) => mockUseKycStatus(...args),
}));

const COMMUNITY = "filecoin";
const REF = "APP-41FY6MKU-26HL9O";

function renderCard() {
  return render(<ApplicationKycCard communityId={COMMUNITY} referenceNumber={REF} />);
}

describe("ApplicationKycCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKycConfig.mockReturnValue({ isEnabled: true, isLoading: false });
    mockUseKycStatus.mockReturnValue({ status: null, isLoading: false, isError: false });
  });

  it("renders nothing when KYC is not configured for the community", () => {
    mockUseKycConfig.mockReturnValue({ isEnabled: false, isLoading: false });

    const { container } = renderCard();

    expect(container).toBeEmptyDOMElement();
  });

  it("resolves status by application reference so inheritance flows through", () => {
    renderCard();

    expect(mockUseKycStatus).toHaveBeenCalledWith(REF, COMMUNITY, { enabled: true });
  });

  it("shows the verified description when the applicant is verified", () => {
    mockUseKycStatus.mockReturnValue({
      status: {
        status: KycVerificationStatus.VERIFIED,
        verificationType: "KYB",
        isExpired: false,
      },
      isLoading: false,
      isError: false,
    });

    renderCard();

    expect(screen.getByText("Identity verification")).toBeInTheDocument();
    expect(screen.getByText("Your identity has been verified successfully.")).toBeInTheDocument();
  });

  it("shows a not-started description when there is no verification yet", () => {
    renderCard();

    expect(
      screen.getByText(/Identity verification is required for this program/)
    ).toBeInTheDocument();
  });

  it("renders an error message when the status fails to load", () => {
    mockUseKycStatus.mockReturnValue({ status: null, isLoading: false, isError: true });

    renderCard();

    expect(
      screen.getByText("Unable to load verification status. Please try again later.")
    ).toBeInTheDocument();
  });

  it("shows only the skeleton (no status text) while loading", () => {
    mockUseKycConfig.mockReturnValue({ isEnabled: true, isLoading: true });
    mockUseKycStatus.mockReturnValue({ status: null, isLoading: true, isError: false });

    renderCard();

    expect(screen.getByText("Identity verification")).toBeInTheDocument();
    expect(screen.queryByText(/Identity verification is required/)).not.toBeInTheDocument();
  });
});
