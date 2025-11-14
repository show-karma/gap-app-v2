import { fireEvent, render, screen } from "@testing-library/react"
import { Button } from "@/components/ui/button"
import "@testing-library/jest-dom"

// Mock Spinner
jest.mock("@/components/ui/spinner", () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}))

describe("Button", () => {
  describe("Rendering", () => {
    it("should render button element", () => {
      render(<Button>Click me</Button>)

      expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("should render children text", () => {
      render(<Button>Test Button</Button>)

      expect(screen.getByText("Test Button")).toBeInTheDocument()
    })

    it("should apply custom className", () => {
      render(<Button className="custom-class">Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("custom-class")
    })

    it("should have default base classes", () => {
      render(<Button>Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("inline-flex", "items-center", "justify-center")
    })
  })

  describe("Variants", () => {
    it("should apply default variant", () => {
      render(<Button>Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("bg-primary")
    })

    it("should apply destructive variant", () => {
      render(<Button variant="destructive">Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("bg-destructive")
    })

    it("should apply outline variant", () => {
      render(<Button variant="outline">Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("border")
    })

    it("should apply secondary variant", () => {
      render(<Button variant="secondary">Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("bg-secondary")
    })

    it("should apply ghost variant", () => {
      render(<Button variant="ghost">Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("hover:bg-accent")
    })

    it("should apply link variant", () => {
      render(<Button variant="link">Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("text-primary", "underline-offset-4")
    })
  })

  describe("Sizes", () => {
    it("should apply default size", () => {
      render(<Button>Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-9", "px-4", "py-2")
    })

    it("should apply sm size", () => {
      render(<Button size="sm">Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-8", "px-3", "text-xs")
    })

    it("should apply lg size", () => {
      render(<Button size="lg">Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-10", "px-8")
    })

    it("should apply icon size", () => {
      render(<Button size="icon">+</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-9", "w-9")
    })
  })

  describe("Loading State", () => {
    it("should show spinner when isLoading is true", () => {
      render(<Button isLoading>Button</Button>)

      expect(screen.getByTestId("spinner")).toBeInTheDocument()
    })

    it("should not show button when loading", () => {
      render(<Button isLoading>Button</Button>)

      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("should show button when isLoading is false", () => {
      render(<Button isLoading={false}>Button</Button>)

      expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("should not show spinner by default", () => {
      render(<Button>Button</Button>)

      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument()
    })
  })

  describe("Disabled State", () => {
    it("should apply disabled attribute", () => {
      render(<Button disabled>Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toBeDisabled()
    })

    it("should have disabled styling", () => {
      render(<Button disabled>Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("disabled:pointer-events-none", "disabled:opacity-50")
    })

    it("should not trigger onClick when disabled", () => {
      const handleClick = jest.fn()

      render(
        <Button disabled onClick={handleClick}>
          Button
        </Button>
      )

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe("Events", () => {
    it("should handle onClick event", () => {
      const handleClick = jest.fn()

      render(<Button onClick={handleClick}>Button</Button>)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("should handle onMouseEnter event", () => {
      const handleMouseEnter = jest.fn()

      render(<Button onMouseEnter={handleMouseEnter}>Button</Button>)

      const button = screen.getByRole("button")
      fireEvent.mouseEnter(button)

      expect(handleMouseEnter).toHaveBeenCalledTimes(1)
    })

    it("should handle onFocus event", () => {
      const handleFocus = jest.fn()

      render(<Button onFocus={handleFocus}>Button</Button>)

      const button = screen.getByRole("button")
      fireEvent.focus(button)

      expect(handleFocus).toHaveBeenCalledTimes(1)
    })
  })

  describe("Accessibility", () => {
    it("should be keyboard accessible", () => {
      render(<Button>Button</Button>)

      const button = screen.getByRole("button")
      button.focus()

      expect(button).toHaveFocus()
    })

    it("should support aria-label", () => {
      render(<Button aria-label="Close dialog">X</Button>)

      expect(screen.getByLabelText("Close dialog")).toBeInTheDocument()
    })

    it("should have focus-visible ring", () => {
      render(<Button>Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("focus-visible:outline-none", "focus-visible:ring-1")
    })

    it("should support type attribute", () => {
      render(<Button type="submit">Submit</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("type", "submit")
    })
  })

  describe("Styling", () => {
    it("should have transition classes", () => {
      render(<Button>Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("transition-colors")
    })

    it("should have rounded corners", () => {
      render(<Button>Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("rounded-md")
    })

    it("should have gap for children", () => {
      render(<Button>Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("gap-2")
    })

    it("should prevent text wrapping", () => {
      render(<Button>Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toHaveClass("whitespace-nowrap")
    })
  })

  describe("Combinations", () => {
    it("should combine variant and size", () => {
      render(
        <Button variant="outline" size="lg">
          Button
        </Button>
      )

      const button = screen.getByRole("button")
      expect(button).toHaveClass("border", "h-10", "px-8")
    })

    it("should combine all props", () => {
      render(
        <Button variant="secondary" size="sm" className="custom" disabled>
          Button
        </Button>
      )

      const button = screen.getByRole("button")
      expect(button).toHaveClass("bg-secondary", "h-8", "px-3", "custom")
      expect(button).toBeDisabled()
    })
  })

  describe("Children", () => {
    it("should render text children", () => {
      render(<Button>Click me</Button>)

      expect(screen.getByText("Click me")).toBeInTheDocument()
    })

    it("should render JSX children", () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      )

      expect(screen.getByText("Icon")).toBeInTheDocument()
      expect(screen.getByText("Text")).toBeInTheDocument()
    })

    it("should render with icons", () => {
      render(
        <Button>
          <svg data-testid="icon" />
          Button
        </Button>
      )

      expect(screen.getByTestId("icon")).toBeInTheDocument()
      expect(screen.getByText("Button")).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty children", () => {
      const { container } = render(<Button />)

      expect(container.querySelector("button")).toBeInTheDocument()
    })

    it("should handle undefined variant", () => {
      render(<Button>Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toBeInTheDocument()
    })

    it("should toggle loading state", () => {
      const { rerender } = render(<Button isLoading={false}>Button</Button>)

      expect(screen.getByRole("button")).toBeInTheDocument()

      rerender(<Button isLoading={true}>Button</Button>)

      expect(screen.queryByRole("button")).not.toBeInTheDocument()
      expect(screen.getByTestId("spinner")).toBeInTheDocument()
    })
  })
})
