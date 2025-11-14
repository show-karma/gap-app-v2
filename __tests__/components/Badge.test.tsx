import { render, screen } from "@testing-library/react"
import { Badge } from "@/components/ui/badge"
import "@testing-library/jest-dom"

describe("Badge", () => {
  describe("Rendering", () => {
    it("should render badge element", () => {
      render(<Badge>Test Badge</Badge>)

      expect(screen.getByText("Test Badge")).toBeInTheDocument()
    })

    it("should render as div element", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge.tagName).toBe("DIV")
    })

    it("should render children text", () => {
      render(<Badge>Status: Active</Badge>)

      expect(screen.getByText("Status: Active")).toBeInTheDocument()
    })

    it("should render with JSX children", () => {
      render(
        <Badge>
          <span>Icon</span>
          <span>Label</span>
        </Badge>
      )

      expect(screen.getByText("Icon")).toBeInTheDocument()
      expect(screen.getByText("Label")).toBeInTheDocument()
    })
  })

  describe("Base Styling", () => {
    it("should have inline-flex display", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("inline-flex")
    })

    it("should have items-center alignment", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("items-center")
    })

    it("should have rounded corners", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("rounded-md")
    })

    it("should have border", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("border")
    })

    it("should have proper padding", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("px-2.5", "py-0.5")
    })

    it("should have small text size", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("text-xs")
    })

    it("should have semibold font weight", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("font-semibold")
    })

    it("should have transition-colors", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("transition-colors")
    })
  })

  describe("Variants", () => {
    it("should apply default variant by default", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("bg-primary", "text-primary-foreground")
    })

    it("should apply default variant explicitly", () => {
      render(<Badge variant="default">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("bg-primary", "text-primary-foreground")
    })

    it("should apply secondary variant", () => {
      render(<Badge variant="secondary">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("bg-secondary", "text-secondary-foreground")
    })

    it("should apply destructive variant", () => {
      render(<Badge variant="destructive">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("bg-destructive", "text-destructive-foreground")
    })

    it("should apply outline variant", () => {
      render(<Badge variant="outline">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("text-foreground")
    })
  })

  describe("Variant Styling", () => {
    it("should have shadow on default variant", () => {
      render(<Badge variant="default">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("shadow")
    })

    it("should have hover effect on default variant", () => {
      render(<Badge variant="default">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("hover:bg-primary/80")
    })

    it("should have hover effect on secondary variant", () => {
      render(<Badge variant="secondary">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("hover:bg-secondary/80")
    })

    it("should have transparent border on default variant", () => {
      render(<Badge variant="default">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("border-transparent")
    })

    it("should have shadow on destructive variant", () => {
      render(<Badge variant="destructive">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("shadow")
    })
  })

  describe("Custom ClassName", () => {
    it("should accept custom className", () => {
      render(<Badge className="custom-class">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("custom-class")
    })

    it("should combine custom className with variant classes", () => {
      render(
        <Badge variant="secondary" className="ml-2">
          Badge
        </Badge>
      )

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("bg-secondary", "ml-2")
    })

    it("should allow multiple custom classes", () => {
      render(<Badge className="mt-4 ml-2 custom">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("mt-4", "ml-2", "custom")
    })
  })

  describe("HTML Attributes", () => {
    it("should accept data attributes", () => {
      render(<Badge data-testid="custom-badge">Badge</Badge>)

      expect(screen.getByTestId("custom-badge")).toBeInTheDocument()
    })

    it("should accept id attribute", () => {
      render(<Badge id="badge-id">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveAttribute("id", "badge-id")
    })

    it("should accept aria-label attribute", () => {
      render(<Badge aria-label="Status badge">Badge</Badge>)

      expect(screen.getByLabelText("Status badge")).toBeInTheDocument()
    })

    it("should accept title attribute", () => {
      render(<Badge title="Badge tooltip">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveAttribute("title", "Badge tooltip")
    })
  })

  describe("Focus Styling", () => {
    it("should have focus outline", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("focus:outline-none")
    })

    it("should have focus ring", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("focus:ring-2", "focus:ring-ring")
    })

    it("should have focus ring offset", () => {
      render(<Badge>Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveClass("focus:ring-offset-2")
    })
  })

  describe("Edge Cases", () => {
    it("should render with empty children", () => {
      const { container } = render(<Badge />)

      expect(container.querySelector("div")).toBeInTheDocument()
    })

    it("should render with numeric children", () => {
      render(<Badge>{5}</Badge>)

      expect(screen.getByText("5")).toBeInTheDocument()
    })

    it("should handle long text content", () => {
      const longText = "This is a very long badge text that might wrap"

      render(<Badge>{longText}</Badge>)

      expect(screen.getByText(longText)).toBeInTheDocument()
    })

    it("should handle special characters", () => {
      render(<Badge>Status: ✓</Badge>)

      expect(screen.getByText("Status: ✓")).toBeInTheDocument()
    })
  })

  describe("Multiple Badges", () => {
    it("should render multiple badges independently", () => {
      render(
        <>
          <Badge variant="default">Badge 1</Badge>
          <Badge variant="secondary">Badge 2</Badge>
          <Badge variant="destructive">Badge 3</Badge>
        </>
      )

      expect(screen.getByText("Badge 1")).toBeInTheDocument()
      expect(screen.getByText("Badge 2")).toBeInTheDocument()
      expect(screen.getByText("Badge 3")).toBeInTheDocument()
    })

    it("should maintain independent styling for each badge", () => {
      const { container } = render(
        <>
          <Badge variant="default">Default</Badge>
          <Badge variant="outline">Outline</Badge>
        </>
      )

      const badges = container.querySelectorAll("div")
      expect(badges[0]).toHaveClass("bg-primary")
      expect(badges[1]).toHaveClass("text-foreground")
    })
  })

  describe("Event Handlers", () => {
    it("should accept onClick handler", () => {
      const handleClick = jest.fn()

      render(<Badge onClick={handleClick}>Badge</Badge>)

      const badge = screen.getByText("Badge")
      badge.click()

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("should accept onMouseEnter handler", () => {
      const handleMouseEnter = jest.fn()

      render(<Badge onMouseEnter={handleMouseEnter}>Badge</Badge>)

      const badge = screen.getByText("Badge")
      require("@testing-library/react").fireEvent.mouseEnter(badge)

      expect(handleMouseEnter).toHaveBeenCalledTimes(1)
    })
  })

  describe("Accessibility", () => {
    it("should be accessible with proper role", () => {
      render(<Badge role="status">Active</Badge>)

      expect(screen.getByRole("status")).toBeInTheDocument()
    })

    it("should support aria-describedby", () => {
      render(<Badge aria-describedby="badge-desc">Badge</Badge>)

      const badge = screen.getByText("Badge")
      expect(badge).toHaveAttribute("aria-describedby", "badge-desc")
    })
  })
})
