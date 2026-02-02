import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type KycStatusResponse, KycVerificationStatus, KycVerificationType } from "@/types/kyc";
import { KycStatusBadge, KycStatusIcon } from "../KycStatusIcon";

describe("KycStatusIcon", () => {
  const createMockStatus = (overrides: Partial<KycStatusResponse> = {}): KycStatusResponse => ({
    projectUID: "project-123",
    communityUID: "community-456",
    status: KycVerificationStatus.VERIFIED,
    verificationType: KycVerificationType.KYC,
    verifiedAt: "2024-01-01T00:00:00Z",
    expiresAt: "2025-01-01T00:00:00Z",
    isExpired: false,
    ...overrides,
  });

  describe("icon rendering", () => {
    it("should render NOT_STARTED icon when status is null", () => {
      render(<KycStatusIcon status={null} />);

      const icon = screen.getByLabelText("Not Started");
      expect(icon).toBeInTheDocument();
    });

    it("should render VERIFIED icon for verified status", () => {
      render(<KycStatusIcon status={createMockStatus()} />);

      const icon = screen.getByLabelText("Verified");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-green-500");
    });

    it("should render PENDING icon for pending status", () => {
      render(
        <KycStatusIcon status={createMockStatus({ status: KycVerificationStatus.PENDING })} />
      );

      const icon = screen.getByLabelText("Pending");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-yellow-500");
    });

    it("should render OUTREACH icon for outreach status", () => {
      render(
        <KycStatusIcon status={createMockStatus({ status: KycVerificationStatus.OUTREACH })} />
      );

      const icon = screen.getByLabelText("Outreach");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-orange-500");
    });

    it("should render REJECTED icon for rejected status", () => {
      render(
        <KycStatusIcon status={createMockStatus({ status: KycVerificationStatus.REJECTED })} />
      );

      const icon = screen.getByLabelText("Rejected");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-red-500");
    });

    it("should render EXPIRED icon when isExpired is true", () => {
      render(
        <KycStatusIcon
          status={createMockStatus({
            status: KycVerificationStatus.VERIFIED,
            isExpired: true,
          })}
        />
      );

      const icon = screen.getByLabelText("Expired");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-amber-500");
    });
  });

  describe("size variants", () => {
    it("should render small size", () => {
      render(<KycStatusIcon status={createMockStatus()} size="sm" />);

      const icon = screen.getByLabelText("Verified");
      expect(icon).toHaveClass("h-4", "w-4");
    });

    it("should render medium size by default", () => {
      render(<KycStatusIcon status={createMockStatus()} />);

      const icon = screen.getByLabelText("Verified");
      expect(icon).toHaveClass("h-5", "w-5");
    });

    it("should render large size", () => {
      render(<KycStatusIcon status={createMockStatus()} size="lg" />);

      const icon = screen.getByLabelText("Verified");
      expect(icon).toHaveClass("h-6", "w-6");
    });
  });

  describe("tooltip", () => {
    it("should show tooltip on hover", async () => {
      const user = userEvent.setup();

      render(<KycStatusIcon status={createMockStatus()} />);

      const trigger = screen.getByLabelText("Verified").closest("span");
      expect(trigger).toBeInTheDocument();

      await user.hover(trigger!);

      // Tooltip content should be visible - use getAllByText since tooltip may render multiple elements
      const tooltipTexts = await screen.findAllByText("KYC verification completed successfully");
      expect(tooltipTexts).toHaveLength(1);
    });

    it("should not render tooltip when showTooltip is false", () => {
      render(<KycStatusIcon status={createMockStatus()} showTooltip={false} />);

      // Should only render the icon, no tooltip wrapper
      const icon = screen.getByLabelText("Verified");
      expect(icon.parentElement?.tagName).not.toBe("SPAN");
    });

    it("should show verification type in tooltip", async () => {
      const user = userEvent.setup();

      render(
        <KycStatusIcon status={createMockStatus({ verificationType: KycVerificationType.KYB })} />
      );

      const trigger = screen.getByLabelText("Verified").closest("span");
      await user.hover(trigger!);

      // Look for Type: KYB pattern in the tooltip
      const typeLabels = await screen.findAllByText(/KYB/);
      expect(typeLabels).toHaveLength(1);
    });
  });

  describe("custom className", () => {
    it("should apply custom className to icon", () => {
      render(<KycStatusIcon status={createMockStatus()} className="custom-class" />);

      const icon = screen.getByLabelText("Verified");
      expect(icon).toHaveClass("custom-class");
    });
  });
});

describe("KycStatusBadge", () => {
  const createMockStatus = (overrides: Partial<KycStatusResponse> = {}): KycStatusResponse => ({
    projectUID: "project-123",
    communityUID: "community-456",
    status: KycVerificationStatus.VERIFIED,
    verificationType: KycVerificationType.KYC,
    verifiedAt: "2024-01-01T00:00:00Z",
    expiresAt: "2025-01-01T00:00:00Z",
    isExpired: false,
    ...overrides,
  });

  describe("badge rendering", () => {
    it("should render badge with correct label for VERIFIED status", () => {
      render(<KycStatusBadge status={createMockStatus()} />);

      expect(screen.getByText("Verified")).toBeInTheDocument();
    });

    it("should render badge with correct label for PENDING status", () => {
      render(
        <KycStatusBadge status={createMockStatus({ status: KycVerificationStatus.PENDING })} />
      );

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("should render badge with correct colors for each status", () => {
      const { rerender, container } = render(<KycStatusBadge status={createMockStatus()} />);

      // Verified - green - find the outer badge span (has inline-flex class)
      let badge = container.querySelector("span.inline-flex");
      expect(badge).toHaveClass("bg-green-100");

      // Pending - yellow
      rerender(
        <KycStatusBadge status={createMockStatus({ status: KycVerificationStatus.PENDING })} />
      );
      badge = container.querySelector("span.inline-flex");
      expect(badge).toHaveClass("bg-yellow-100");

      // Rejected - red
      rerender(
        <KycStatusBadge status={createMockStatus({ status: KycVerificationStatus.REJECTED })} />
      );
      badge = container.querySelector("span.inline-flex");
      expect(badge).toHaveClass("bg-red-100");
    });

    it("should show EXPIRED badge when isExpired is true regardless of status", () => {
      render(
        <KycStatusBadge
          status={createMockStatus({
            status: KycVerificationStatus.VERIFIED,
            isExpired: true,
          })}
        />
      );

      expect(screen.getByText("Expired")).toBeInTheDocument();
    });

    it("should render NOT_STARTED badge when status is null", () => {
      render(<KycStatusBadge status={null} />);

      expect(screen.getByText("Not Started")).toBeInTheDocument();
    });
  });

  describe("tooltip on badge", () => {
    it("should show tooltip on hover", async () => {
      const user = userEvent.setup();

      render(<KycStatusBadge status={createMockStatus()} />);

      const badge = screen.getByText("Verified").closest("span");
      await user.hover(badge!);

      // Use getAllByText since tooltip may render multiple elements
      const tooltipTexts = await screen.findAllByText("KYC verification completed successfully");
      expect(tooltipTexts).toHaveLength(1);
    });
  });

  describe("custom className", () => {
    it("should apply custom className to badge", () => {
      const { container } = render(
        <KycStatusBadge status={createMockStatus()} className="custom-badge" />
      );

      // Find the outer badge span (has inline-flex class)
      const badge = container.querySelector("span.inline-flex");
      expect(badge).toHaveClass("custom-badge");
    });
  });
});
