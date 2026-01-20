import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { Project } from "@/types/v2/project";
import { DonateSection } from "../SidePanel/DonateSection";
import { EndorseSection } from "../SidePanel/EndorseSection";
import { ProjectSidePanel } from "../SidePanel/ProjectSidePanel";
import { QuickLinksCard } from "../SidePanel/QuickLinksCard";
import { SubscribeSection } from "../SidePanel/SubscribeSection";

// Mock the stores
const mockSetIsEndorsementOpen = jest.fn();
const mockSetIsIntroModalOpen = jest.fn();

jest.mock("@/store/modals/endorsement", () => ({
  useEndorsementStore: () => ({
    setIsEndorsementOpen: mockSetIsEndorsementOpen,
  }),
}));

jest.mock("@/store/modals/intro", () => ({
  useIntroModalStore: () => ({
    setIsIntroModalOpen: mockSetIsIntroModalOpen,
  }),
}));

// Mock fetchData for SubscribeSection
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve([{}, null])),
}));

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock wagmi
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234567890123456789012345678901234567890" }),
}));

const mockProject: Project = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  chainID: 1,
  owner: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  details: {
    title: "Test Project",
    description: "A test project description",
    slug: "test-project",
    links: [
      { type: "website", url: "https://example.com" },
      { type: "pitchDeck", url: "https://docs.example.com/deck" },
      { type: "demoVideo", url: "https://youtube.com/watch?v=123" },
    ],
  },
  members: [],
};

const mockProjectNoLinks: Project = {
  ...mockProject,
  details: {
    ...mockProject.details,
    links: [],
  },
};

describe("DonateSection", () => {
  describe("Rendering", () => {
    it("should render donate section", () => {
      render(<DonateSection project={mockProject} />);

      expect(screen.getByTestId("donate-section")).toBeInTheDocument();
    });

    it("should render amount input", () => {
      render(<DonateSection project={mockProject} />);

      expect(screen.getByTestId("donate-amount-input")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter amount")).toBeInTheDocument();
    });

    it("should render donate button", () => {
      render(<DonateSection project={mockProject} />);

      expect(screen.getByTestId("donate-button")).toBeInTheDocument();
      expect(screen.getByText("Donate")).toBeInTheDocument();
    });

    it("should render header with icon", () => {
      render(<DonateSection project={mockProject} />);

      expect(screen.getByText("Support this project")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should disable button when amount is empty", () => {
      render(<DonateSection project={mockProject} />);

      const button = screen.getByTestId("donate-button");
      expect(button).toBeDisabled();
    });

    it("should disable button when amount is zero", () => {
      render(<DonateSection project={mockProject} />);

      const input = screen.getByTestId("donate-amount-input");
      fireEvent.change(input, { target: { value: "0" } });

      const button = screen.getByTestId("donate-button");
      expect(button).toBeDisabled();
    });

    it("should enable button when valid amount is entered", () => {
      render(<DonateSection project={mockProject} />);

      const input = screen.getByTestId("donate-amount-input");
      fireEvent.change(input, { target: { value: "10" } });

      const button = screen.getByTestId("donate-button");
      expect(button).not.toBeDisabled();
    });

    it("should call onDonate callback when button is clicked", () => {
      const handleDonate = jest.fn();
      render(<DonateSection project={mockProject} onDonate={handleDonate} />);

      const input = screen.getByTestId("donate-amount-input");
      fireEvent.change(input, { target: { value: "25" } });

      const button = screen.getByTestId("donate-button");
      fireEvent.click(button);

      expect(handleDonate).toHaveBeenCalledWith("25");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<DonateSection project={mockProject} className="custom-class" />);

      expect(screen.getByTestId("donate-section")).toHaveClass("custom-class");
    });
  });
});

describe("EndorseSection", () => {
  beforeEach(() => {
    mockSetIsEndorsementOpen.mockClear();
  });

  describe("Rendering", () => {
    it("should render endorse section", () => {
      render(<EndorseSection project={mockProject} />);

      expect(screen.getByTestId("endorse-section")).toBeInTheDocument();
    });

    it("should render message textarea", () => {
      render(<EndorseSection project={mockProject} />);

      expect(screen.getByTestId("endorse-message-input")).toBeInTheDocument();
    });

    it("should render endorse button", () => {
      render(<EndorseSection project={mockProject} />);

      expect(screen.getByTestId("endorse-button")).toBeInTheDocument();
      expect(screen.getByText("Endorse")).toBeInTheDocument();
    });

    it("should render header with icon", () => {
      render(<EndorseSection project={mockProject} />);

      expect(screen.getByText("Endorse this project")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should open endorsement dialog when button is clicked", () => {
      render(<EndorseSection project={mockProject} />);

      const button = screen.getByTestId("endorse-button");
      fireEvent.click(button);

      expect(mockSetIsEndorsementOpen).toHaveBeenCalledWith(true);
    });

    it("should allow typing in message textarea", () => {
      render(<EndorseSection project={mockProject} />);

      const textarea = screen.getByTestId("endorse-message-input");
      fireEvent.change(textarea, { target: { value: "Great project!" } });

      expect(textarea).toHaveValue("Great project!");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<EndorseSection project={mockProject} className="custom-class" />);

      expect(screen.getByTestId("endorse-section")).toHaveClass("custom-class");
    });
  });
});

describe("SubscribeSection", () => {
  describe("Rendering", () => {
    it("should render subscribe section", () => {
      render(<SubscribeSection project={mockProject} />);

      expect(screen.getByTestId("subscribe-section")).toBeInTheDocument();
    });

    it("should render name input", () => {
      render(<SubscribeSection project={mockProject} />);

      expect(screen.getByTestId("subscribe-name-input")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("First name (optional)")).toBeInTheDocument();
    });

    it("should render email input", () => {
      render(<SubscribeSection project={mockProject} />);

      expect(screen.getByTestId("subscribe-email-input")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    });

    it("should render subscribe button", () => {
      render(<SubscribeSection project={mockProject} />);

      expect(screen.getByTestId("subscribe-button")).toBeInTheDocument();
      expect(screen.getByText("Subscribe")).toBeInTheDocument();
    });

    it("should render header with icon", () => {
      render(<SubscribeSection project={mockProject} />);

      expect(screen.getByText("Stay Updated")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should show error for invalid email", async () => {
      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByTestId("subscribe-email-error")).toBeInTheDocument();
      });
    });

    it("should not show error for valid email", async () => {
      render(<SubscribeSection project={mockProject} />);

      const emailInput = screen.getByTestId("subscribe-email-input");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.queryByTestId("subscribe-email-error")).not.toBeInTheDocument();
      });
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<SubscribeSection project={mockProject} className="custom-class" />);

      expect(screen.getByTestId("subscribe-section")).toHaveClass("custom-class");
    });
  });
});

describe("QuickLinksCard", () => {
  beforeEach(() => {
    mockSetIsIntroModalOpen.mockClear();
  });

  describe("Rendering", () => {
    it("should render quick links card", () => {
      render(<QuickLinksCard project={mockProject} />);

      expect(screen.getByTestId("quick-links-card")).toBeInTheDocument();
    });

    it("should always render Request Intro link", () => {
      render(<QuickLinksCard project={mockProject} />);

      expect(screen.getByTestId("quick-link-request-intro")).toBeInTheDocument();
      expect(screen.getByText("Request Intro")).toBeInTheDocument();
    });

    it("should render website link when available", () => {
      render(<QuickLinksCard project={mockProject} />);

      expect(screen.getByTestId("quick-link-website")).toBeInTheDocument();
      expect(screen.getByText("Website")).toBeInTheDocument();
    });

    it("should render pitch deck link when available", () => {
      render(<QuickLinksCard project={mockProject} />);

      expect(screen.getByTestId("quick-link-pitch-deck")).toBeInTheDocument();
      expect(screen.getByText("Pitch Deck")).toBeInTheDocument();
    });

    it("should render demo video link when available", () => {
      render(<QuickLinksCard project={mockProject} />);

      expect(screen.getByTestId("quick-link-demo-video")).toBeInTheDocument();
      expect(screen.getByText("Demo Video")).toBeInTheDocument();
    });

    it("should only render Request Intro when no links available", () => {
      render(<QuickLinksCard project={mockProjectNoLinks} />);

      expect(screen.getByText("Request Intro")).toBeInTheDocument();
      expect(screen.queryByText("Website")).not.toBeInTheDocument();
      expect(screen.queryByText("Pitch Deck")).not.toBeInTheDocument();
      expect(screen.queryByText("Demo Video")).not.toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("should open intro modal when Request Intro is clicked", () => {
      render(<QuickLinksCard project={mockProject} />);

      const requestIntroButton = screen.getByTestId("quick-link-request-intro");
      fireEvent.click(requestIntroButton);

      expect(mockSetIsIntroModalOpen).toHaveBeenCalledWith(true);
    });
  });

  describe("URL Protocol Handling", () => {
    it("should handle URLs without protocol", () => {
      const projectWithNoProtocol: Project = {
        ...mockProject,
        details: {
          ...mockProject.details,
          links: [{ type: "website", url: "example.com" }],
        },
      };

      render(<QuickLinksCard project={projectWithNoProtocol} />);

      const websiteLink = screen.getByTestId("quick-link-website");
      expect(websiteLink).toHaveAttribute("href", "https://example.com");
    });

    it("should preserve URLs with protocol", () => {
      render(<QuickLinksCard project={mockProject} />);

      const websiteLink = screen.getByTestId("quick-link-website");
      expect(websiteLink).toHaveAttribute("href", "https://example.com");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<QuickLinksCard project={mockProject} className="custom-class" />);

      expect(screen.getByTestId("quick-links-card")).toHaveClass("custom-class");
    });
  });
});

describe("ProjectSidePanel", () => {
  describe("Rendering", () => {
    it("should render side panel container", () => {
      render(<ProjectSidePanel project={mockProject} />);

      expect(screen.getByTestId("project-side-panel")).toBeInTheDocument();
    });

    it("should render donate section", () => {
      render(<ProjectSidePanel project={mockProject} />);

      expect(screen.getByTestId("donate-section")).toBeInTheDocument();
    });

    it("should render endorse section", () => {
      render(<ProjectSidePanel project={mockProject} />);

      expect(screen.getByTestId("endorse-section")).toBeInTheDocument();
    });

    it("should render subscribe section", () => {
      render(<ProjectSidePanel project={mockProject} />);

      expect(screen.getByTestId("subscribe-section")).toBeInTheDocument();
    });

    it("should render quick links card", () => {
      render(<ProjectSidePanel project={mockProject} />);

      expect(screen.getByTestId("quick-links-card")).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have desktop-only visibility class", () => {
      render(<ProjectSidePanel project={mockProject} />);

      const sidePanel = screen.getByTestId("project-side-panel");
      expect(sidePanel).toHaveClass("hidden");
      expect(sidePanel).toHaveClass("lg:flex");
    });

    it("should have fixed width class", () => {
      render(<ProjectSidePanel project={mockProject} />);

      const sidePanel = screen.getByTestId("project-side-panel");
      expect(sidePanel).toHaveClass("w-[324px]");
    });
  });

  describe("Props Passing", () => {
    it("should pass onDonate to DonateSection", () => {
      const handleDonate = jest.fn();
      render(<ProjectSidePanel project={mockProject} onDonate={handleDonate} />);

      const input = screen.getByTestId("donate-amount-input");
      fireEvent.change(input, { target: { value: "50" } });

      const button = screen.getByTestId("donate-button");
      fireEvent.click(button);

      expect(handleDonate).toHaveBeenCalledWith("50");
    });
  });

  describe("Styling", () => {
    it("should accept custom className", () => {
      render(<ProjectSidePanel project={mockProject} className="custom-class" />);

      expect(screen.getByTestId("project-side-panel")).toHaveClass("custom-class");
    });
  });
});
