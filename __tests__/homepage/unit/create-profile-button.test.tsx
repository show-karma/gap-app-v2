/**
 * CreateProfileButton Component Tests
 * Tests the profile creation button with modal integration
 *
 * Target: 5 tests
 * - Rendering (2)
 * - Click Behavior (2)
 * - Accessibility (1)
 */

import { CreateProfileButton } from "@/src/features/homepage/components/create-profile-button";
import { fireEvent, renderWithProviders, screen } from "../utils/test-helpers";
import "@testing-library/jest-dom";

// Mock the contributor profile modal store
const mockOpenModal = jest.fn();
jest.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: () => ({
    openModal: mockOpenModal,
    closeModal: jest.fn(),
    isOpen: false,
  }),
}));

describe("CreateProfileButton Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render button with correct text", () => {
    renderWithProviders(<CreateProfileButton />);

    const button = screen.getByRole("button", { name: /Create Profile/i });
    expect(button).toBeInTheDocument();
  });

  it("should apply correct styling classes", () => {
    renderWithProviders(<CreateProfileButton />);

    const button = screen.getByRole("button", { name: /Create Profile/i });
    expect(button).toHaveClass("px-6");
    expect(button).toHaveClass("py-2.5");
    expect(button).toHaveClass("text-sm");
    expect(button).toHaveClass("font-medium");
  });

  it("should open modal when clicked", () => {
    renderWithProviders(<CreateProfileButton />);

    const button = screen.getByRole("button", { name: /Create Profile/i });
    fireEvent.click(button);

    expect(mockOpenModal).toHaveBeenCalledWith({ isGlobal: true });
  });

  it("should call openModal with correct parameters", () => {
    renderWithProviders(<CreateProfileButton />);

    const button = screen.getByRole("button", { name: /Create Profile/i });
    fireEvent.click(button);

    expect(mockOpenModal).toHaveBeenCalledTimes(1);
    expect(mockOpenModal).toHaveBeenCalledWith({ isGlobal: true });
  });

  it("should be keyboard accessible", () => {
    renderWithProviders(<CreateProfileButton />);

    const button = screen.getByRole("button", { name: /Create Profile/i });
    expect(button).not.toHaveAttribute("disabled");
    expect(button.tagName).toBe("BUTTON");
  });
});
