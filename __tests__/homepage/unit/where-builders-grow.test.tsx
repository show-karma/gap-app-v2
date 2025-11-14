/**
 * WhereBuildersGrow Component Tests
 * Tests the final CTA section
 *
 * Target: 7 tests
 * - Rendering (3)
 * - Button Display (2)
 * - Navigation (1)
 * - Accessibility (1)
 */

import { WhereBuildersGrow } from "@/src/features/homepage/components/where-builders-grow"
import { renderWithProviders, screen } from "../utils/test-helpers"
import "@testing-library/jest-dom"

// Mock CreateProjectButton
jest.mock("@/src/features/homepage/components/create-project-button", () => ({
  CreateProjectButton: () => <button data-testid="create-project-button">Create project</button>,
}))

// Mock PAGES utility
jest.mock("@/utilities/pages", () => ({
  PAGES: {
    FUNDERS: "/funders",
  },
}))

describe("WhereBuildersGrow Component", () => {
  it("should render section heading", () => {
    renderWithProviders(<WhereBuildersGrow />)

    const heading = screen.getByText(/Where builders grow/i)
    expect(heading).toBeInTheDocument()
  })

  it("should render section description with user count", () => {
    renderWithProviders(<WhereBuildersGrow />)

    const description = screen.getByText(/Join over 4,000\+ startups already growing with Karma/i)
    expect(description).toBeInTheDocument()
  })

  it("should render CreateProjectButton", () => {
    renderWithProviders(<WhereBuildersGrow />)

    const createButton = screen.getByTestId("create-project-button")
    expect(createButton).toBeInTheDocument()
  })

  it("should render 'Grow your ecosystem' button", () => {
    renderWithProviders(<WhereBuildersGrow />)

    const growButton = screen.getByRole("link", { name: /Grow your ecosystem/i })
    expect(growButton).toBeInTheDocument()
  })

  it("should link 'Grow your ecosystem' to funders page", () => {
    renderWithProviders(<WhereBuildersGrow />)

    const growButton = screen.getByRole("link", { name: /Grow your ecosystem/i })
    expect(growButton).toHaveAttribute("href", "/funders")
  })

  it("should center content", () => {
    const { container } = renderWithProviders(<WhereBuildersGrow />)

    const section = container.querySelector("section")
    const innerDiv = section?.querySelector("div")

    expect(innerDiv).toHaveClass("items-center")
  })

  it("should use semantic HTML structure", () => {
    const { container } = renderWithProviders(<WhereBuildersGrow />)

    const section = container.querySelector("section")
    expect(section).toBeInTheDocument()

    const heading = screen.getByRole("heading", { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent(/Where builders grow/i)
  })
})
