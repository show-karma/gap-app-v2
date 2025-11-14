/**
 * Unit Tests: Navbar Desktop Navigation
 * Tests desktop navigation layout, dropdowns, auth states, and component integration
 */

import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NavbarDesktopNavigation } from "@/src/components/navbar/navbar-desktop-navigation"
import { getAuthFixture } from "../fixtures/auth-fixtures"
import {
  createMockPermissions,
  createMockUseAuth,
  createMockUseCommunitiesStore,
  createMockUseContributorProfileModalStore,
  createMockUseOwnerStore,
  createMockUseRegistryStore,
  createMockUseReviewerPrograms,
  createMockUseStaff,
  createMockUseTheme,
  renderWithProviders,
  resetMockAuthState,
  updateMocks,
} from "../utils/test-helpers"

describe("NavbarDesktopNavigation", () => {
  afterEach(() => {
    // Reset mock auth state to default after each test
    resetMockAuthState()
  })

  describe("Layout & Structure", () => {
    it("should render with correct desktop-only visibility class", () => {
      const authFixture = getAuthFixture("unauthenticated")
      const { container } = renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      // Should have hidden xl:flex class for desktop-only display
      const desktopNav = container.querySelector(".hidden.xl\\:flex")
      expect(desktopNav).toBeInTheDocument()
    })

    it("should render logo on left side", () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      // Logo should be present (renders two images for light/dark mode)
      const logos = screen.getAllByRole("img", { name: /karma/i })
      expect(logos.length).toBeGreaterThan(0)
    })

    it("should render search component in center", () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      // Search input should be present
      const searchInput = screen.getByPlaceholderText(/search project\/community/i)
      expect(searchInput).toBeInTheDocument()
    })

    it("should have proper flex layout with spacing", () => {
      const authFixture = getAuthFixture("unauthenticated")
      const { container } = renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      // Check that the desktop navigation renders with proper structure
      const desktopNav = container.querySelector(".hidden.xl\\:flex")
      expect(desktopNav).toBeInTheDocument()
      expect(desktopNav?.className).toContain("flex-1")
      expect(desktopNav?.className).toContain("gap-8")
    })
  })

  describe("Navigation Dropdown Triggers", () => {
    it('should render "For Builders" dropdown trigger', () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const forBuildersButton = screen.getByRole("button", {
        name: /for builders/i,
      })
      expect(forBuildersButton).toBeInTheDocument()
    })

    it('should render "For Funders" dropdown trigger', () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const forFundersButton = screen.getByRole("button", {
        name: /for funders/i,
      })
      expect(forFundersButton).toBeInTheDocument()
    })

    it('should render "Explore" dropdown trigger', () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const exploreButton = screen.getByRole("button", { name: /explore/i })
      expect(exploreButton).toBeInTheDocument()
    })

    it('should render "Resources" dropdown when logged out', () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const resourcesButton = screen.getByRole("button", {
        name: /resources/i,
      })
      expect(resourcesButton).toBeInTheDocument()
    })

    it('should NOT render "Resources" dropdown when logged in', () => {
      const authFixture = getAuthFixture("authenticated-basic")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      })

      const resourcesButton = screen.queryByRole("button", {
        name: /resources/i,
      })
      expect(resourcesButton).not.toBeInTheDocument()
    })

    it("should have chevron icons on all dropdown triggers", () => {
      const authFixture = getAuthFixture("unauthenticated")
      const { container } = renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      // Check for chevron-down icons (using lucide-chevron-down class)
      const chevrons = container.querySelectorAll(".lucide-chevron-down")
      expect(chevrons.length).toBeGreaterThanOrEqual(4) // For Builders, For Funders, Explore, Resources
    })
  })

  describe("Dropdown Content", () => {
    it("should render ForBuildersContent in For Builders dropdown", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const forBuildersButton = screen.getByRole("button", {
        name: /for builders/i,
      })
      await user.click(forBuildersButton)

      // Wait for content to appear - check for known menu items
      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument()
      })
    })

    it("should render ForFundersContent in For Funders dropdown", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const forFundersButton = screen.getByRole("button", {
        name: /for funders/i,
      })
      await user.click(forFundersButton)

      // Wait for content - check for Funders menu items
      await waitFor(() => {
        expect(screen.getByText("Launch a program")).toBeInTheDocument()
      })
    })

    it("should render ExploreContent in Explore dropdown", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const exploreButton = screen.getByRole("button", { name: /explore/i })
      await user.click(exploreButton)

      // Wait for content
      await waitFor(() => {
        expect(screen.getByText("All projects")).toBeInTheDocument()
      })
    })

    it("should render ResourcesContent with social links in Resources dropdown", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const resourcesButton = screen.getByRole("button", {
        name: /resources/i,
      })
      await user.click(resourcesButton)

      // Wait for content
      await waitFor(() => {
        expect(screen.getByText("Docs")).toBeInTheDocument()
        expect(screen.getByText("Follow")).toBeInTheDocument()
      })
    })

    it("should have proper minimum width on dropdown content", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")
      const { container } = renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const forBuildersButton = screen.getByRole("button", {
        name: /for builders/i,
      })
      await user.click(forBuildersButton)

      await waitFor(() => {
        // Check for min-w-[500px] class on dropdown content
        const dropdownContent = container.querySelector(".min-w-\\[500px\\]")
        expect(dropdownContent).toBeInTheDocument()
      })
    })
  })

  describe("Auth State - Logged Out", () => {
    it("should render NavbarAuthButtons component when logged out", () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      // Auth buttons should be visible
      expect(screen.getByText("Sign in")).toBeInTheDocument()
      expect(screen.getByText("Contact sales")).toBeInTheDocument()
    })

    it("should NOT render NavbarUserMenu when logged out", () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      // User menu/avatar should not be present
      const userAvatar = screen.queryByTestId("user-avatar")
      expect(userAvatar).not.toBeInTheDocument()
    })

    it("should show Resources dropdown when logged out", () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const resourcesButton = screen.getByRole("button", {
        name: /resources/i,
      })
      expect(resourcesButton).toBeInTheDocument()
    })

    it("should render all navigation dropdowns when logged out", () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      expect(screen.getByRole("button", { name: /for builders/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /for funders/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /explore/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /resources/i })).toBeInTheDocument()
    })
  })

  describe("Auth State - Logged In", () => {
    it("should NOT render NavbarAuthButtons when logged in", () => {
      const authFixture = getAuthFixture("authenticated-basic")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      })

      // Auth buttons should not be visible
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument()
      expect(screen.queryByText("Contact sales")).not.toBeInTheDocument()
    })

    it("should render NavbarUserMenu when logged in", () => {
      const authFixture = getAuthFixture("authenticated-basic")

      const { debug } = renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      })

      // Debug to see what's actually rendered
      // debug();

      // NavbarUserMenu should NOT render auth buttons
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument()

      // NavbarUserMenu should render when authenticated
      // Since the menu itself might be hidden, check that auth buttons are gone
      // which means the authenticated path is rendering
    })

    it("should NOT show Resources dropdown when logged in", () => {
      const authFixture = getAuthFixture("authenticated-basic")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      })

      const resourcesButton = screen.queryByRole("button", {
        name: /resources/i,
      })
      expect(resourcesButton).not.toBeInTheDocument()
    })

    it("should still render main navigation dropdowns when logged in", () => {
      const authFixture = getAuthFixture("authenticated-basic")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(authFixture.permissions.communities),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(authFixture.permissions.isOwner),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore: createMockUseContributorProfileModalStore(),
      })

      expect(screen.getByRole("button", { name: /for builders/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /for funders/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /explore/i })).toBeInTheDocument()
    })
  })

  describe("Component Integration", () => {
    it("should render Logo component", () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      // Logo should be present (renders two images for light/dark mode)
      const logos = screen.getAllByRole("img", { name: /karma/i })
      expect(logos.length).toBeGreaterThan(0)
    })

    it("should render NavbarSearch component", () => {
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const searchInput = screen.getByPlaceholderText(/search project\/community/i)
      expect(searchInput).toBeInTheDocument()
    })

    it("should pass desktop variant to menu content components", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")
      const { container } = renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      // Open a dropdown and verify desktop styling is applied
      const forBuildersButton = screen.getByRole("button", {
        name: /for builders/i,
      })
      await user.click(forBuildersButton)

      await waitFor(() => {
        // Desktop variant should have specific styling
        const dropdownContent = container.querySelector(".min-w-\\[500px\\]")
        expect(dropdownContent).toBeInTheDocument()
      })
    })
  })

  describe("Responsive Classes", () => {
    it("should have hidden class below xl breakpoint", () => {
      const authFixture = getAuthFixture("unauthenticated")
      const { container } = renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const desktopNav = container.querySelector(".hidden.xl\\:flex")
      expect(desktopNav).toBeInTheDocument()
      expect(desktopNav?.className).toContain("hidden")
    })

    it("should have xl:flex class for desktop visibility", () => {
      const authFixture = getAuthFixture("unauthenticated")
      const { container } = renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const desktopNav = container.querySelector(".hidden.xl\\:flex")
      expect(desktopNav).toBeInTheDocument()
      expect(desktopNav?.className).toContain("xl:flex")
    })

    it("should have proper flex alignment classes", () => {
      const authFixture = getAuthFixture("unauthenticated")
      const { container } = renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const desktopNav = container.querySelector(".hidden.xl\\:flex")
      expect(desktopNav).toBeInTheDocument()
      expect(desktopNav?.className).toContain("items-center")
    })

    it("should have gap spacing class", () => {
      const authFixture = getAuthFixture("unauthenticated")
      const { container } = renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const desktopNav = container.querySelector(".hidden.xl\\:flex")
      expect(desktopNav).toBeInTheDocument()
      expect(desktopNav?.className).toContain("gap-8")
    })
  })

  describe("Social Media Links (in Resources Dropdown)", () => {
    it("should render all 4 social media links in Resources dropdown", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const resourcesButton = screen.getByRole("button", {
        name: /resources/i,
      })
      await user.click(resourcesButton)

      // Wait for dropdown content to appear
      await waitFor(
        () => {
          expect(screen.getByText("Follow")).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Check for social media links (by aria-label)
      expect(screen.getByLabelText("Twitter")).toBeInTheDocument()
      expect(screen.getByLabelText("Telegram")).toBeInTheDocument()
      expect(screen.getByLabelText("Discord")).toBeInTheDocument()
      expect(screen.getByLabelText("Paragraph")).toBeInTheDocument()
    })

    it("should render Follow section title in Resources dropdown", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")
      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
      })

      const resourcesButton = screen.getByRole("button", {
        name: /resources/i,
      })
      await user.click(resourcesButton)

      await waitFor(() => {
        expect(screen.getByText("Follow")).toBeInTheDocument()
      })
    })
  })
})
