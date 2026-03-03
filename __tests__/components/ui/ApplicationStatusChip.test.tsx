import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ApplicationStatusChip } from "@/src/components/ui/ApplicationStatusChip";

describe("ApplicationStatusChip", () => {
  describe("variant prop", () => {
    it("renders with default variant (flat) - border-transparent class", () => {
      const { container } = render(<ApplicationStatusChip status="pending" />);
      const badge = container.querySelector(".border-transparent");
      expect(badge).toBeInTheDocument();
    });

    it("renders variant='flat' explicitly - border-transparent", () => {
      const { container } = render(<ApplicationStatusChip status="approved" variant="flat" />);
      const badge = container.querySelector(".border-transparent");
      expect(badge).toBeInTheDocument();
    });

    it("renders variant='bordered' - has border and border-current classes", () => {
      const { container } = render(<ApplicationStatusChip status="pending" variant="bordered" />);
      const badge = container.firstElementChild;
      expect(badge).toHaveClass("border");
      expect(badge).toHaveClass("border-current");
    });

    it("renders variant='solid' - border-transparent class", () => {
      const { container } = render(<ApplicationStatusChip status="approved" variant="solid" />);
      const badge = container.querySelector(".border-transparent");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("status text formatting", () => {
    it("renders 'Pending' for status='pending'", () => {
      render(<ApplicationStatusChip status="pending" />);
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("renders 'Approved' for status='approved'", () => {
      render(<ApplicationStatusChip status="approved" />);
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });

    it("renders 'Rejected' for status='rejected'", () => {
      render(<ApplicationStatusChip status="rejected" />);
      expect(screen.getByText("Rejected")).toBeInTheDocument();
    });

    it("renders 'Cancelled' for status='canceled'", () => {
      render(<ApplicationStatusChip status="canceled" />);
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });

    it("renders 'Under Review' for status='under_review'", () => {
      render(<ApplicationStatusChip status="under_review" />);
      expect(screen.getByText("Under Review")).toBeInTheDocument();
    });

    it("renders 'Revision Requested' for status='revision_requested'", () => {
      render(<ApplicationStatusChip status="revision_requested" />);
      expect(screen.getByText("Revision Requested")).toBeInTheDocument();
    });

    it("renders 'Draft' for status='draft'", () => {
      render(<ApplicationStatusChip status="draft" />);
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("renders 'Submitted' for status='submitted'", () => {
      render(<ApplicationStatusChip status="submitted" />);
      expect(screen.getByText("Submitted")).toBeInTheDocument();
    });
  });

  describe("color per status", () => {
    it("shows green color classes for approved status", () => {
      const { container } = render(<ApplicationStatusChip status="approved" />);
      const badge = container.firstElementChild;
      expect(badge?.className).toMatch(/green/);
    });

    it("shows green color classes for accepted status", () => {
      const { container } = render(<ApplicationStatusChip status="accepted" />);
      const badge = container.firstElementChild;
      expect(badge?.className).toMatch(/green/);
    });

    it("shows red color classes for rejected status", () => {
      const { container } = render(<ApplicationStatusChip status="rejected" />);
      const badge = container.firstElementChild;
      expect(badge?.className).toMatch(/red/);
    });

    it("shows red color classes for canceled status", () => {
      const { container } = render(<ApplicationStatusChip status="canceled" />);
      const badge = container.firstElementChild;
      expect(badge?.className).toMatch(/red/);
    });

    it("shows yellow color classes for pending status", () => {
      const { container } = render(<ApplicationStatusChip status="pending" />);
      const badge = container.firstElementChild;
      expect(badge?.className).toMatch(/yellow/);
    });

    it("shows yellow color classes for resubmitted status", () => {
      const { container } = render(<ApplicationStatusChip status="resubmitted" />);
      const badge = container.firstElementChild;
      expect(badge?.className).toMatch(/yellow/);
    });
  });

  describe("onlyShowApproved prop", () => {
    it("renders null when onlyShowApproved=true and status is not approved", () => {
      const { container } = render(<ApplicationStatusChip status="pending" onlyShowApproved />);
      expect(container.firstChild).toBeNull();
    });

    it("renders chip when onlyShowApproved=true and status is approved", () => {
      render(<ApplicationStatusChip status="approved" onlyShowApproved />);
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });
  });

  describe("size prop", () => {
    it("applies sm size classes", () => {
      const { container } = render(<ApplicationStatusChip status="pending" size="sm" />);
      const badge = container.firstElementChild;
      expect(badge).toHaveClass("text-[10px]", "px-1.5", "py-0");
    });

    it("applies md size classes (default)", () => {
      const { container } = render(<ApplicationStatusChip status="pending" size="md" />);
      const badge = container.firstElementChild;
      expect(badge).toHaveClass("text-xs", "px-2.5", "py-0.5");
    });

    it("applies lg size classes", () => {
      const { container } = render(<ApplicationStatusChip status="pending" size="lg" />);
      const badge = container.firstElementChild;
      expect(badge).toHaveClass("text-sm", "px-3", "py-1");
    });
  });

  describe("case normalization", () => {
    it("normalizes uppercase status to correct display", () => {
      render(<ApplicationStatusChip status="APPROVED" />);
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });

    it("normalizes hyphens in status for color styling (getStatusStyle)", () => {
      // "under-review" normalizes hyphens → underscore for STATUS_STYLES lookup
      // But formatStatus doesn't normalize hyphens, so text is "Under-review" (fallback)
      const { container } = render(<ApplicationStatusChip status="under-review" />);
      const badge = container.firstElementChild;
      // Color still matches "under_review" style (bg-primary/10)
      expect(badge?.className).toMatch(/primary/);
    });
  });
});
