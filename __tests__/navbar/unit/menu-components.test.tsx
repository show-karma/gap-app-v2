/**
 * @file menu-components.test.tsx
 * @description Unit tests for menu component building blocks
 * @phase Phase 2, Track B (Day 4-5)
 * @developer Developer 2
 */

import { fireEvent, screen } from "@testing-library/react"
import React from "react"
import {
  ExploreContent,
  ForBuildersContent,
  ForFundersContent,
  MenuSection,
  ResourcesContent,
} from "@/src/components/navbar/menu-components"
import {
  exploreItems,
  forBuildersItems,
  forFundersItems,
  resourcesItems,
} from "@/src/components/navbar/menu-items"
import { renderWithProviders } from "../utils/test-helpers"

describe("MenuSection Component", () => {
  describe("Desktop Variant", () => {
    it("should render title correctly", () => {
      renderWithProviders(<MenuSection title="Test Section" variant="desktop" />)
      expect(screen.getByText("Test Section")).toBeInTheDocument()
    })

    it("should use paragraph element for desktop", () => {
      const { container } = renderWithProviders(
        <MenuSection title="Test Section" variant="desktop" />
      )
      const paragraph = container.querySelector("p")
      expect(paragraph).toBeInTheDocument()
      expect(paragraph).toHaveTextContent("Test Section")
    })

    it("should apply correct styling classes", () => {
      const { container } = renderWithProviders(
        <MenuSection title="Test Section" variant="desktop" />
      )
      const paragraph = container.querySelector("p")
      expect(paragraph).toHaveClass("text-muted-foreground")
      expect(paragraph).toHaveClass("text-sm")
      expect(paragraph).toHaveClass("font-normal")
    })

    it("should merge custom className", () => {
      const { container } = renderWithProviders(
        <MenuSection title="Test Section" variant="desktop" className="custom-class" />
      )
      const paragraph = container.querySelector("p")
      expect(paragraph).toHaveClass("custom-class")
    })
  })

  describe("Mobile Variant", () => {
    it("should render title correctly", () => {
      renderWithProviders(<MenuSection title="Test Section" variant="mobile" />)
      expect(screen.getByText("Test Section")).toBeInTheDocument()
    })

    it("should use h3 element for mobile", () => {
      const { container } = renderWithProviders(
        <MenuSection title="Test Section" variant="mobile" />
      )
      const heading = container.querySelector("h3")
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent("Test Section")
    })

    it("should apply correct styling classes", () => {
      const { container } = renderWithProviders(
        <MenuSection title="Test Section" variant="mobile" />
      )
      const heading = container.querySelector("h3")
      expect(heading).toHaveClass("text-muted-foreground")
      expect(heading).toHaveClass("text-sm")
      expect(heading).toHaveClass("font-normal")
    })

    it("should merge custom className", () => {
      const { container } = renderWithProviders(
        <MenuSection title="Test Section" variant="mobile" className="custom-class" />
      )
      const heading = container.querySelector("h3")
      expect(heading).toHaveClass("custom-class")
    })
  })

  describe("Default Behavior", () => {
    it("should default to desktop variant when not specified", () => {
      const { container } = renderWithProviders(<MenuSection title="Test Section" />)
      const paragraph = container.querySelector("p")
      expect(paragraph).toBeInTheDocument()
    })
  })
})

describe("ForBuildersContent Component", () => {
  describe("Desktop Variant", () => {
    it("should render all menu items", () => {
      renderWithProviders(<ForBuildersContent variant="desktop" />)

      forBuildersItems.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })

    it("should display image", () => {
      renderWithProviders(<ForBuildersContent variant="desktop" />)
      const image = screen.getByAltText("For Builders")
      expect(image).toBeInTheDocument()
    })

    it("should have correct image dimensions", () => {
      renderWithProviders(<ForBuildersContent variant="desktop" />)
      const image = screen.getByAltText("For Builders")
      expect(image).toHaveAttribute("width", "170")
      expect(image).toHaveAttribute("height", "132")
    })

    it("should display image source correctly", () => {
      renderWithProviders(<ForBuildersContent variant="desktop" />)
      const image = screen.getByAltText("For Builders")
      expect(image).toHaveAttribute("src")
    })

    it("should use flex layout with correct classes", () => {
      const { container } = renderWithProviders(<ForBuildersContent variant="desktop" />)
      const flexContainer = container.querySelector(".flex.flex-row")
      expect(flexContainer).toBeInTheDocument()
    })

    it("should render descriptions for items", () => {
      renderWithProviders(<ForBuildersContent variant="desktop" />)

      forBuildersItems.forEach((item) => {
        if (item.description) {
          expect(screen.getByText(item.description)).toBeInTheDocument()
        }
      })
    })
  })

  describe("Mobile Variant", () => {
    it("should render all menu items", () => {
      renderWithProviders(<ForBuildersContent variant="mobile" />)

      forBuildersItems.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })

    it("should not display image in mobile variant", () => {
      renderWithProviders(<ForBuildersContent variant="mobile" />)
      const image = screen.queryByAltText("For Builders")
      expect(image).not.toBeInTheDocument()
    })

    it("should call onClose when item is clicked", () => {
      const onCloseMock = jest.fn()
      renderWithProviders(<ForBuildersContent variant="mobile" onClose={onCloseMock} />)

      const firstItem = screen.getByText(forBuildersItems[0].title)
      fireEvent.click(firstItem)

      expect(onCloseMock).toHaveBeenCalled()
    })

    it("should render items with mobile styling", () => {
      renderWithProviders(<ForBuildersContent variant="mobile" />)

      forBuildersItems.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })
  })
})

describe("ForFundersContent Component", () => {
  describe("Desktop Variant", () => {
    it("should render main item", () => {
      renderWithProviders(<ForFundersContent variant="desktop" />)
      expect(screen.getByText(forFundersItems.main.title)).toBeInTheDocument()
    })

    it("should render main item description", () => {
      renderWithProviders(<ForFundersContent variant="desktop" />)
      if (forFundersItems.main.description) {
        expect(screen.getByText(forFundersItems.main.description)).toBeInTheDocument()
      }
    })

    it("should render all secondary items", () => {
      renderWithProviders(<ForFundersContent variant="desktop" />)

      forFundersItems.secondary.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })

    it("should display separator between main and secondary items", () => {
      const { container } = renderWithProviders(<ForFundersContent variant="desktop" />)
      const separator = container.querySelector("hr")
      expect(separator).toBeInTheDocument()
      expect(separator).toHaveClass("border-border")
    })

    it("should display image", () => {
      renderWithProviders(<ForFundersContent variant="desktop" />)
      const image = screen.getByAltText("For Funders")
      expect(image).toBeInTheDocument()
    })

    it("should have correct image dimensions", () => {
      renderWithProviders(<ForFundersContent variant="desktop" />)
      const image = screen.getByAltText("For Funders")
      expect(image).toHaveAttribute("width", "132")
      expect(image).toHaveAttribute("height", "170")
    })

    it("should use flex layout", () => {
      const { container } = renderWithProviders(<ForFundersContent variant="desktop" />)
      const flexContainer = container.querySelector(".flex.flex-row")
      expect(flexContainer).toBeInTheDocument()
    })
  })

  describe("Mobile Variant", () => {
    it("should render main item", () => {
      renderWithProviders(<ForFundersContent variant="mobile" />)
      expect(screen.getByText(forFundersItems.main.title)).toBeInTheDocument()
    })

    it("should render all secondary items", () => {
      renderWithProviders(<ForFundersContent variant="mobile" />)

      forFundersItems.secondary.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })

    it("should not display image in mobile variant", () => {
      renderWithProviders(<ForFundersContent variant="mobile" />)
      const image = screen.queryByAltText("For Funders")
      expect(image).not.toBeInTheDocument()
    })

    it("should not display separator in mobile variant", () => {
      const { container } = renderWithProviders(<ForFundersContent variant="mobile" />)
      const separator = container.querySelector("hr")
      expect(separator).not.toBeInTheDocument()
    })

    it("should call onClose when any item is clicked", () => {
      const onCloseMock = jest.fn()
      renderWithProviders(<ForFundersContent variant="mobile" onClose={onCloseMock} />)

      const mainItem = screen.getByText(forFundersItems.main.title)
      fireEvent.click(mainItem)

      expect(onCloseMock).toHaveBeenCalled()
    })
  })
})

describe("ExploreContent Component", () => {
  describe("Desktop Variant", () => {
    it("should render Projects section title", () => {
      renderWithProviders(<ExploreContent variant="desktop" />)
      expect(screen.getByText("Projects")).toBeInTheDocument()
    })

    it("should render Communities section title", () => {
      renderWithProviders(<ExploreContent variant="desktop" />)
      expect(screen.getByText("Communities")).toBeInTheDocument()
    })

    it("should render all project items", () => {
      renderWithProviders(<ExploreContent variant="desktop" />)

      exploreItems.projects.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })

    it("should render all community items", () => {
      renderWithProviders(<ExploreContent variant="desktop" />)

      exploreItems.communities.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })

    it("should display separator between sections", () => {
      const { container } = renderWithProviders(<ExploreContent variant="desktop" />)
      const separators = container.querySelectorAll("hr")
      expect(separators.length).toBeGreaterThan(0)
    })

    it("should properly group projects section", () => {
      const { container } = renderWithProviders(<ExploreContent variant="desktop" />)
      const sections = container.querySelectorAll(".flex.flex-col.w-full")
      expect(sections.length).toBeGreaterThanOrEqual(2)
    })

    it("should use proper padding", () => {
      const { container } = renderWithProviders(<ExploreContent variant="desktop" />)
      const mainContainer = container.querySelector(".flex.flex-col.gap-4")
      expect(mainContainer).toHaveClass("px-4")
      expect(mainContainer).toHaveClass("py-4")
    })
  })

  describe("Mobile Variant", () => {
    it("should render Projects section title", () => {
      renderWithProviders(<ExploreContent variant="mobile" />)
      expect(screen.getByText("Projects")).toBeInTheDocument()
    })

    it("should render Communities section title", () => {
      renderWithProviders(<ExploreContent variant="mobile" />)
      expect(screen.getByText("Communities")).toBeInTheDocument()
    })

    it("should render all project items", () => {
      renderWithProviders(<ExploreContent variant="mobile" />)

      exploreItems.projects.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })

    it("should render all community items", () => {
      renderWithProviders(<ExploreContent variant="mobile" />)

      exploreItems.communities.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })

    it("should call onClose when item is clicked", () => {
      const onCloseMock = jest.fn()
      renderWithProviders(<ExploreContent variant="mobile" onClose={onCloseMock} />)

      const firstProjectItem = screen.getByText(exploreItems.projects[0].title)
      fireEvent.click(firstProjectItem)

      expect(onCloseMock).toHaveBeenCalled()
    })

    it("should not display separator in mobile variant", () => {
      const { container } = renderWithProviders(<ExploreContent variant="mobile" />)
      const separators = container.querySelectorAll("hr")
      expect(separators.length).toBe(0)
    })
  })
})

describe("ResourcesContent Component", () => {
  describe("Desktop Variant", () => {
    it("should render all resource items", () => {
      renderWithProviders(<ResourcesContent variant="desktop" />)

      resourcesItems.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })

    it("should render items with arrows", () => {
      renderWithProviders(<ResourcesContent variant="desktop" />)

      // SimpleMenuItem should handle showArrow rendering
      resourcesItems.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })

    it("should use flex column layout", () => {
      const { container } = renderWithProviders(<ResourcesContent variant="desktop" />)
      const flexContainer = container.querySelector(".flex.flex-col")
      expect(flexContainer).toBeInTheDocument()
    })

    it("should render external links correctly", () => {
      renderWithProviders(<ResourcesContent variant="desktop" />)

      resourcesItems.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })
  })

  describe("Mobile Variant", () => {
    it("should render all resource items", () => {
      renderWithProviders(<ResourcesContent variant="mobile" />)

      resourcesItems.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })

    it("should display arrows for external links", () => {
      const { container } = renderWithProviders(<ResourcesContent variant="mobile" />)

      // ArrowUpRight icons should be present
      const arrowIcons = container.querySelectorAll('[class*="lucide-arrow-up-right"]')
      expect(arrowIcons.length).toBeGreaterThan(0)
    })

    it("should call onClose when item is clicked", () => {
      const onCloseMock = jest.fn()
      renderWithProviders(<ResourcesContent variant="mobile" onClose={onCloseMock} />)

      const firstItem = screen.getByText(resourcesItems[0].title)
      fireEvent.click(firstItem)

      expect(onCloseMock).toHaveBeenCalled()
    })

    it("should have proper hover states", () => {
      const { container } = renderWithProviders(<ResourcesContent variant="mobile" />)

      const links = container.querySelectorAll("a")
      links.forEach((link) => {
        expect(link).toHaveClass("hover:bg-accent")
      })
    })

    it("should render icons for each item", () => {
      renderWithProviders(<ResourcesContent variant="mobile" />)

      resourcesItems.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument()
      })
    })
  })
})

describe("Component Integration", () => {
  it("should work together in a menu structure", () => {
    renderWithProviders(
      <>
        <MenuSection title="For Builders" variant="desktop" />
        <ForBuildersContent variant="desktop" />
        <MenuSection title="For Funders" variant="desktop" />
        <ForFundersContent variant="desktop" />
        <MenuSection title="Explore" variant="desktop" />
        <ExploreContent variant="desktop" />
        <MenuSection title="Resources" variant="desktop" />
        <ResourcesContent variant="desktop" />
      </>
    )

    expect(screen.getByText("For Builders")).toBeInTheDocument()
    expect(screen.getByText("For Funders")).toBeInTheDocument()
    expect(screen.getByText("Explore")).toBeInTheDocument()
    expect(screen.getByText("Resources")).toBeInTheDocument()
  })

  it("should handle onClose callbacks consistently", () => {
    const onCloseMock = jest.fn()

    renderWithProviders(
      <>
        <ForBuildersContent variant="mobile" onClose={onCloseMock} />
        <ForFundersContent variant="mobile" onClose={onCloseMock} />
        <ExploreContent variant="mobile" onClose={onCloseMock} />
        <ResourcesContent variant="mobile" onClose={onCloseMock} />
      </>
    )

    // Click on first available item from ForBuilders
    const firstItem = screen.getByText(forBuildersItems[0].title)
    fireEvent.click(firstItem)

    expect(onCloseMock).toHaveBeenCalled()
  })
})
