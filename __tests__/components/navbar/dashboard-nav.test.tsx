import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockAuthState, mockNavbarPermissionsState } from "@/__tests__/navbar/setup";
import { useContributorProfile } from "@/hooks/useContributorProfile";
import { NavbarDesktopNavigation } from "@/src/components/navbar/navbar-desktop-navigation";
import { NavbarUserMenu } from "@/src/components/navbar/navbar-user-menu";

jest.mock("@/hooks/useContributorProfile", () => ({
  useContributorProfile: jest.fn(),
}));

const mockUseContributorProfile = useContributorProfile as unknown as jest.Mock;

describe("Dashboard nav updates", () => {
  beforeEach(() => {
    mockNavbarPermissionsState.current = {
      ...mockNavbarPermissionsState.current,
      isLoggedIn: true,
      ready: true,
      address: "0x123",
      isRegistryAllowed: false,
    };

    mockAuthState.current = {
      ...mockAuthState.current,
      ready: true,
      authenticated: true,
      isConnected: true,
      address: "0x123",
    };

    mockUseContributorProfile.mockReturnValue({ profile: { data: { name: "Alex" } } });
  });

  it("shows Dashboard button and hides role links in desktop navigation", () => {
    render(<NavbarDesktopNavigation />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByText("My projects")).not.toBeInTheDocument();
    expect(screen.queryByText("Review")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows Manage Programs for registry admins in desktop navigation", () => {
    mockNavbarPermissionsState.current = {
      ...mockNavbarPermissionsState.current,
      isRegistryAllowed: true,
    };

    render(<NavbarDesktopNavigation />);

    expect(screen.getByRole("link", { name: "Manage Programs" })).toBeInTheDocument();
  });

  it("shows Dashboard in user menu and removes Review/Admin items", async () => {
    const user = userEvent.setup();

    render(<NavbarUserMenu />);

    await user.click(screen.getByText("Alex"));

    expect(screen.getByRole("menuitem", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByText("My projects")).not.toBeInTheDocument();
    expect(screen.queryByText("Review")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });
});
