import { render, screen } from "@testing-library/react"
import React from "react"
import { GrantNotCompletedButton } from "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton/GrantNotCompletedButton"
import "@testing-library/jest-dom"

// Mock Next.js Link
jest.mock("next/link", () => {
  return ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
})

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  CheckCircleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="check-circle-icon" className={className} />
  ),
}))

// Mock PAGES utility
jest.mock("@/utilities/pages", () => ({
  PAGES: {
    PROJECT: {
      SCREENS: {
        SELECTED_SCREEN: (project: string, grant: string, screen: string) =>
          `/project/${project}/funding/${grant}/${screen}`,
      },
    },
  },
}))

describe("GrantNotCompletedButton", () => {
  const mockProject = {
    uid: "project-456",
    details: {
      data: {
        slug: "test-project",
      },
    },
  } as any

  const grantUID = "grant-123"

  describe("Rendering", () => {
    it("should render Link component", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={grantUID} />)

      const link = screen.getByRole("link")
      expect(link).toBeInTheDocument()
    })

    it("should show default 'Mark as Complete' text", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={grantUID} />)

      expect(screen.getByText("Mark as Complete")).toBeInTheDocument()
    })

    it("should show CheckCircleIcon", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={grantUID} />)

      expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument()
    })

    it("should apply correct CSS classes", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={grantUID} />)

      const link = screen.getByRole("link")
      expect(link).toHaveClass(
        "hover:opacity-75",
        "flex",
        "flex-row",
        "items-center",
        "justify-center",
        "gap-2",
        "rounded-md",
        "bg-green-600",
        "px-3.5",
        "py-2",
        "text-sm",
        "font-semibold",
        "text-white",
        "hover:bg-green-700"
      )
    })
  })

  describe("Link href", () => {
    it("should generate correct href using PAGES.PROJECT.SCREENS.SELECTED_SCREEN", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={grantUID} />)

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/project/test-project/funding/grant-123/complete-grant")
    })

    it("should use project slug when available", () => {
      const projectWithSlug = {
        ...mockProject,
        details: {
          data: {
            slug: "my-awesome-project",
          },
        },
      }

      render(<GrantNotCompletedButton project={projectWithSlug} grantUID={grantUID} />)

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute(
        "href",
        "/project/my-awesome-project/funding/grant-123/complete-grant"
      )
    })

    it("should fall back to project.uid when slug is missing", () => {
      const projectWithoutSlug = {
        uid: "project-789",
        details: {
          data: {},
        },
      } as any

      render(<GrantNotCompletedButton project={projectWithoutSlug} grantUID={grantUID} />)

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/project/project-789/funding/grant-123/complete-grant")
    })

    it("should fall back to project.uid when details.data is missing", () => {
      const projectWithoutDetails = {
        uid: "project-999",
      } as any

      render(<GrantNotCompletedButton project={projectWithoutDetails} grantUID={grantUID} />)

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/project/project-999/funding/grant-123/complete-grant")
    })

    it("should include grantUID in href", () => {
      const customGrantUID = "custom-grant-456"

      render(<GrantNotCompletedButton project={mockProject} grantUID={customGrantUID} />)

      const link = screen.getByRole("link")
      expect(link.getAttribute("href")).toContain(customGrantUID)
    })

    it("should include 'complete-grant' screen in href", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={grantUID} />)

      const link = screen.getByRole("link")
      expect(link.getAttribute("href")).toContain("complete-grant")
    })
  })

  describe("Text Customization", () => {
    it("should use custom text prop when provided", () => {
      const customText = "Complete This Grant"

      render(
        <GrantNotCompletedButton project={mockProject} grantUID={grantUID} text={customText} />
      )

      expect(screen.getByText(customText)).toBeInTheDocument()
      expect(screen.queryByText("Mark as Complete")).not.toBeInTheDocument()
    })

    it("should use default text when text prop is undefined", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={grantUID} text={undefined} />)

      expect(screen.getByText("Mark as Complete")).toBeInTheDocument()
    })

    it("should handle empty string text", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={grantUID} text="" />)

      const link = screen.getByRole("link")
      expect(link.textContent).toBe("")
    })

    it("should handle various text values", () => {
      const { rerender } = render(
        <GrantNotCompletedButton project={mockProject} grantUID={grantUID} text="First Text" />
      )

      expect(screen.getByText("First Text")).toBeInTheDocument()

      rerender(
        <GrantNotCompletedButton project={mockProject} grantUID={grantUID} text="Second Text" />
      )

      expect(screen.getByText("Second Text")).toBeInTheDocument()
      expect(screen.queryByText("First Text")).not.toBeInTheDocument()
    })
  })

  describe("Icon Rendering", () => {
    it("should render CheckCircleIcon with correct className", () => {
      render(<GrantNotCompletedButton project={mockProject} grantUID={grantUID} />)

      const icon = screen.getByTestId("check-circle-icon")
      expect(icon).toHaveClass("h-5", "w-5")
    })

    it("should render icon inside a div with h-5 w-5", () => {
      const { container } = render(
        <GrantNotCompletedButton project={mockProject} grantUID={grantUID} />
      )

      const iconContainer = container.querySelector(".h-5.w-5")
      expect(iconContainer).toBeInTheDocument()
    })
  })

  describe("Props Combinations", () => {
    it("should handle all props correctly", () => {
      const customProject = {
        uid: "custom-project",
        details: {
          data: {
            slug: "custom-slug",
          },
        },
      } as any

      render(
        <GrantNotCompletedButton
          project={customProject}
          grantUID="custom-grant"
          text="Custom Text"
        />
      )

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute(
        "href",
        "/project/custom-slug/funding/custom-grant/complete-grant"
      )
      expect(screen.getByText("Custom Text")).toBeInTheDocument()
      expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument()
    })
  })
})
