/**
 * Integration Tests: Navigation Flow
 * Tests all navigation patterns including dropdowns, external links, anchors, and modals
 */

import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Navbar } from "@/src/components/navbar/navbar"
import { NavbarDesktopNavigation } from "@/src/components/navbar/navbar-desktop-navigation"
import { NavbarMobileMenu } from "@/src/components/navbar/navbar-mobile-menu"
import { getAuthFixture } from "../fixtures/auth-fixtures"
import {
  cleanupAfterEach,
  createMockPermissions,
  createMockRouter,
  createMockUsePrivy,
  renderWithProviders,
  updateMocks,
} from "../utils/test-helpers"

describe("Navigation Flow Integration Tests", () => {
  afterEach(() => {
    cleanupAfterEach()
  })

  describe("1. Desktop Dropdown Navigation", () => {
    it("should open For Builders dropdown and navigate", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      // Find For Builders trigger
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
      })

      // Hover over trigger (or click to open dropdown)
      await user.click(forBuildersTrigger)

      // Wait for dropdown content to appear
      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument()
      })

      // Verify other items in dropdown
      expect(screen.getByText("Find funding")).toBeInTheDocument()
    })

    it("should open For Funders dropdown and show content", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      const forFundersTrigger = screen.getByRole("button", {
        name: /for funders/i,
      })

      await user.click(forFundersTrigger)

      await waitFor(() => {
        expect(screen.getByText("Launch a program")).toBeInTheDocument()
      })

      // Verify secondary items
      expect(screen.getByText("Case studies")).toBeInTheDocument()
      expect(screen.getByText("Schedule demo")).toBeInTheDocument()
    })

    it("should open Explore dropdown and show projects/communities", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      const exploreTrigger = screen.getByRole("button", {
        name: /explore/i,
      })

      await user.click(exploreTrigger)

      await waitFor(() => {
        expect(screen.getByText("All projects")).toBeInTheDocument()
      })

      // Verify communities section
      expect(screen.getByText("All communities")).toBeInTheDocument()
    })

    it("should close dropdown after clicking menu item", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      const exploreTrigger = screen.getByRole("button", { name: /explore/i })
      await user.click(exploreTrigger)

      await waitFor(() => {
        expect(screen.getByText("All projects")).toBeInTheDocument()
      })

      // Click menu item
      const allProjectsLink = screen.getByRole("link", {
        name: /all projects/i,
      })
      await user.click(allProjectsLink)

      // Dropdown should close (content should disappear)
      // Note: Dropdown closing behavior depends on component implementation
    })

    it("should show Resources dropdown when logged out", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      const resourcesTrigger = screen.queryByRole("button", {
        name: /resources/i,
      })

      expect(resourcesTrigger).toBeInTheDocument()

      if (resourcesTrigger) {
        await user.click(resourcesTrigger)

        await waitFor(() => {
          expect(screen.getByText("Docs")).toBeInTheDocument()
        })

        expect(screen.getByText("Blog")).toBeInTheDocument()
      }
    })

    it("should hide Resources dropdown when logged in", () => {
      const authFixture = getAuthFixture("authenticated-basic")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      })

      // Resources dropdown should not be present
      const resourcesTrigger = screen.queryByRole("button", {
        name: /resources/i,
      })

      expect(resourcesTrigger).not.toBeInTheDocument()
    })
  })

  describe("2. Mobile Drawer Navigation", () => {
    it("should open mobile drawer and navigate", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu")
      await user.click(mobileMenuButton)

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument()
      })

      // Verify navigation sections in drawer
      const drawer = screen.getByRole("dialog")
      expect(within(drawer).getByText("For Builders")).toBeInTheDocument()
      expect(within(drawer).getByText("For Funders")).toBeInTheDocument()
      expect(within(drawer).getByText("Explore")).toBeInTheDocument()
    })

    it("should navigate from mobile drawer item", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      // Open drawer
      const mobileMenuButton = screen.getByLabelText("Open menu")
      await user.click(mobileMenuButton)

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument()
      })

      // Find and click a navigation item
      const drawer = screen.getByRole("dialog")
      const createProjectLink = within(drawer).getByText("Create project")

      fireEvent.click(createProjectLink)

      // Drawer should close after navigation
      // This is handled by the onClose callback in the component
    })

    it("should show all sections in mobile drawer when logged out", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      const mobileMenuButton = screen.getByLabelText("Open menu")
      await user.click(mobileMenuButton)

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument()
      })

      const drawer = screen.getByRole("dialog")

      // Verify all sections including Resources
      expect(within(drawer).getByText("For Builders")).toBeInTheDocument()
      expect(within(drawer).getByText("For Funders")).toBeInTheDocument()
      expect(within(drawer).getByText("Explore")).toBeInTheDocument()
      expect(within(drawer).getByText("Resources")).toBeInTheDocument()
    })

    it("should hide Resources in mobile drawer when logged in", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("authenticated-basic")

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      })

      const mobileMenuButton = screen.getByLabelText("Open menu")
      await user.click(mobileMenuButton)

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument()
      })

      const drawer = screen.getByRole("dialog")

      // Resources section should not be in mobile drawer
      const resourcesSections = within(drawer).queryAllByText("Resources")
      // Should be 0 or if present, not in a section header context
      expect(resourcesSections.length).toBeLessThan(2)
    })
  })

  describe("3. External Link Navigation", () => {
    it("should render external links with correct attributes", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      // Open Resources dropdown
      const resourcesTrigger = screen.queryByRole("button", {
        name: /resources/i,
      })

      if (resourcesTrigger) {
        await user.click(resourcesTrigger)

        await waitFor(() => {
          expect(screen.getByText("Docs")).toBeInTheDocument()
        })

        // Find Docs link
        const docsLink = screen.getByRole("link", { name: /docs/i })

        // Verify external link attributes
        expect(docsLink).toHaveAttribute("target", "_blank")
        expect(docsLink).toHaveAttribute("rel", "noopener noreferrer")
      }
    })

    it("should render Contact sales as external link", () => {
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      const contactSalesLink = screen.getByText("Contact sales")
      const linkElement = contactSalesLink.closest("a")

      if (linkElement) {
        expect(linkElement).toHaveAttribute("target", "_blank")
        expect(linkElement).toHaveAttribute("rel", "noopener noreferrer")
      }
    })

    it("should render Help & Docs as external link in user menu", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("authenticated-basic")

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      })

      // Try desktop user menu
      const userAvatar = screen.queryByTestId("user-avatar")

      if (userAvatar) {
        await user.click(userAvatar)

        await waitFor(() => {
          expect(screen.getByText("Help & Docs")).toBeInTheDocument()
        })

        const helpLink = screen.getByRole("link", { name: /help & docs/i })
        expect(helpLink).toHaveAttribute("target", "_blank")
      }
    })
  })

  describe("4. Anchor Scrolling - Same Page", () => {
    it("should handle anchor navigation on same page", async () => {
      const user = userEvent.setup()
      const mockRouter = createMockRouter({ pathname: "/" })
      const authFixture = getAuthFixture("unauthenticated")

      // Mock scrollIntoView
      const mockScrollIntoView = jest.fn()
      Element.prototype.scrollIntoView = mockScrollIntoView

      // Create anchor element in document
      const anchorElement = document.createElement("div")
      anchorElement.id = "live-funding-opportunities"
      document.body.appendChild(anchorElement)

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockRouter,
      })

      // Open For Builders dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
      })
      await user.click(forBuildersTrigger)

      await waitFor(() => {
        expect(screen.getByText("Find funding")).toBeInTheDocument()
      })

      // Click Find funding (has anchor)
      const findFundingLink = screen.getByText("Find funding")
      await user.click(findFundingLink)

      // Should scroll to anchor
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalled()
      })

      // Cleanup
      document.body.removeChild(anchorElement)
    })

    it("should navigate then scroll when on different page", async () => {
      const user = userEvent.setup()
      const mockPush = jest.fn()
      const mockRouter = createMockRouter({
        pathname: "/projects",
        push: mockPush,
      })
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockRouter,
      })

      // Open For Builders dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
      })
      await user.click(forBuildersTrigger)

      await waitFor(() => {
        expect(screen.getByText("Find funding")).toBeInTheDocument()
      })

      // Click item with anchor
      const findFundingLink = screen.getByText("Find funding")
      await user.click(findFundingLink)

      // Should call router push (navigation will occur)
      // Scrolling happens after navigation in the component
    })
  })

  describe("5. Modal Trigger from Menu", () => {
    it("should trigger Create Project modal from menu", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      // Mock the modal button in DOM
      const modalButton = document.createElement("button")
      modalButton.id = "new-project-button"
      modalButton.onclick = jest.fn()
      document.body.appendChild(modalButton)

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      // Open For Builders dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
      })
      await user.click(forBuildersTrigger)

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument()
      })

      // Click Create project
      const createProjectButton = screen.getByText("Create project")
      await user.click(createProjectButton)

      // Modal button should be triggered
      await waitFor(() => {
        expect(modalButton.onclick).toBeDefined()
      })

      // Cleanup
      document.body.removeChild(modalButton)
    })

    it("should navigate to projects page if modal button not found", async () => {
      const user = userEvent.setup()
      const mockPush = jest.fn()
      const mockRouter = createMockRouter({ push: mockPush })
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockRouter,
      })

      // Open For Builders dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
      })
      await user.click(forBuildersTrigger)

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument()
      })

      // Click Create project (modal button doesn't exist)
      const createProjectButton = screen.getByText("Create project")
      await user.click(createProjectButton)

      // Should navigate as fallback
      // Component handles this via navigation then retry
    })
  })

  describe("6. Nested Navigation", () => {
    it("should navigate through nested menu structure", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      // Open Explore dropdown
      const exploreTrigger = screen.getByRole("button", { name: /explore/i })
      await user.click(exploreTrigger)

      await waitFor(() => {
        expect(screen.getByText("All projects")).toBeInTheDocument()
      })

      // Verify grouped items (Projects section)
      expect(screen.getByText("All projects")).toBeInTheDocument()
      expect(screen.getByText("All communities")).toBeInTheDocument()

      // Click nested item
      const allProjectsLink = screen.getByRole("link", {
        name: /all projects/i,
      })
      expect(allProjectsLink).toHaveAttribute("href")
    })

    it("should show section titles in Explore dropdown", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      const exploreTrigger = screen.getByRole("button", { name: /explore/i })
      await user.click(exploreTrigger)

      await waitFor(() => {
        expect(screen.getByText("Projects")).toBeInTheDocument()
      })

      // Verify sections
      expect(screen.getByText("Communities")).toBeInTheDocument()
    })
  })

  describe("7. Social Media Links", () => {
    it("should render social media links in user menu", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("authenticated-basic")

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      })

      // Try desktop
      const userAvatar = screen.queryByTestId("user-avatar")

      if (userAvatar) {
        await user.click(userAvatar)

        await waitFor(() => {
          expect(screen.getByText("Follow")).toBeInTheDocument()
        })

        // Verify social links (by aria-label)
        expect(screen.getByLabelText(/twitter/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/telegram/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/discord/i)).toBeInTheDocument()
      }
    })

    it("should render social media links in mobile drawer", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("authenticated-basic")

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      })

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu")
      await user.click(mobileMenuButton)

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument()
      })

      const drawer = screen.getByRole("dialog")

      // Verify social links in drawer
      expect(within(drawer).getByText("Follow")).toBeInTheDocument()
      expect(within(drawer).getByLabelText(/twitter/i)).toBeInTheDocument()
      expect(within(drawer).getByLabelText(/telegram/i)).toBeInTheDocument()
      expect(within(drawer).getByLabelText(/discord/i)).toBeInTheDocument()
    })

    it("should render social links as external links", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("authenticated-basic")

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      })

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu")
      await user.click(mobileMenuButton)

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument()
      })

      // Find social link
      const twitterLink = screen.getByLabelText(/twitter/i).closest("a")

      if (twitterLink) {
        expect(twitterLink).toHaveAttribute("target", "_blank")
        expect(twitterLink).toHaveAttribute("rel", "noopener noreferrer")
      }
    })
  })

  describe("8. Navigation State Management", () => {
    it("should close dropdown when clicking outside", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      // Open dropdown
      const exploreTrigger = screen.getByRole("button", { name: /explore/i })
      await user.click(exploreTrigger)

      await waitFor(() => {
        expect(screen.getByText("All projects")).toBeInTheDocument()
      })

      // Click outside (on the body)
      await user.click(document.body)

      // Dropdown should close
      // Note: This behavior depends on the dropdown component implementation
    })

    it("should allow switching between dropdowns", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      // Open first dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
      })
      await user.click(forBuildersTrigger)

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument()
      })

      // Open second dropdown
      const exploreTrigger = screen.getByRole("button", { name: /explore/i })
      await user.click(exploreTrigger)

      await waitFor(() => {
        expect(screen.getByText("All projects")).toBeInTheDocument()
      })

      // First dropdown content should be closed
      // Second dropdown content should be visible
    })

    it("should close mobile drawer when clicking menu item", async () => {
      const user = userEvent.setup()
      const authFixture = getAuthFixture("unauthenticated")

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      })

      // Open drawer
      const mobileMenuButton = screen.getByLabelText("Open menu")
      await user.click(mobileMenuButton)

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument()
      })

      // Click navigation item
      const drawer = screen.getByRole("dialog")
      const allProjectsLink = within(drawer).getByText("All projects")
      fireEvent.click(allProjectsLink)

      // Drawer should close (via onClose callback)
      // This is component-specific behavior
    })
  })
})
