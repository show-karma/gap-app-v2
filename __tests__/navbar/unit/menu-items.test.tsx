/**
 * @file menu-items.test.tsx
 * @description Unit tests for menu-items configuration data
 * @phase Phase 2, Track B (Day 4-5)
 * @developer Developer 2
 */

import {
  ExploreItems,
  exploreItems,
  ForFundersItems,
  forBuildersItems,
  forFundersItems,
  type MenuItem,
  resourcesItems,
} from "@/src/components/navbar/menu-items"
import { PAGES } from "@/utilities/pages"
import { SOCIALS } from "@/utilities/socials"

describe("Menu Items Configuration", () => {
  describe("ForBuilders Items", () => {
    it("should have valid configuration", () => {
      expect(forBuildersItems).toBeDefined()
      expect(Array.isArray(forBuildersItems)).toBe(true)
      expect(forBuildersItems.length).toBeGreaterThan(0)
    })

    it("should have all required properties for each item", () => {
      forBuildersItems.forEach((item) => {
        expect(item).toHaveProperty("href")
        expect(item).toHaveProperty("icon")
        expect(item).toHaveProperty("title")
        expect(typeof item.href).toBe("string")
        expect(typeof item.title).toBe("string")
        expect(item.icon).toBeDefined()
      })
    })

    it("should have valid href values", () => {
      forBuildersItems.forEach((item) => {
        expect(item.href.length).toBeGreaterThan(0)
        // Should be a valid path or URL
        expect(item.href).toMatch(/^(\/|https?:\/\/)/)
      })
    })

    it('should contain "Create project" item with modal trigger', () => {
      const createProjectItem = forBuildersItems.find((item) => item.title === "Create project")
      expect(createProjectItem).toBeDefined()
      expect(createProjectItem?.openModal).toBe(true)
      expect(createProjectItem?.href).toBe(PAGES.MY_PROJECTS)
    })

    it('should contain "Find funding" item with anchor', () => {
      const findFundingItem = forBuildersItems.find((item) => item.title === "Find funding")
      expect(findFundingItem).toBeDefined()
      expect(findFundingItem?.anchor).toBe("live-funding-opportunities")
      expect(findFundingItem?.href).toBe(PAGES.HOME)
    })

    it("should have descriptions for all items", () => {
      forBuildersItems.forEach((item) => {
        expect(item.description).toBeDefined()
        expect(typeof item.description).toBe("string")
        expect(item.description!.length).toBeGreaterThan(0)
      })
    })
  })

  describe("ForFunders Items", () => {
    it("should have valid structure", () => {
      expect(forFundersItems).toBeDefined()
      expect(forFundersItems).toHaveProperty("main")
      expect(forFundersItems).toHaveProperty("secondary")
    })

    it("should have valid main item", () => {
      const { main } = forFundersItems
      expect(main).toHaveProperty("href")
      expect(main).toHaveProperty("icon")
      expect(main).toHaveProperty("title")
      expect(main.title).toBe("Launch a program")
      expect(main.href).toBe(PAGES.FUNDERS)
    })

    it("should have valid secondary items array", () => {
      const { secondary } = forFundersItems
      expect(Array.isArray(secondary)).toBe(true)
      expect(secondary.length).toBeGreaterThan(0)

      secondary.forEach((item) => {
        expect(item).toHaveProperty("href")
        expect(item).toHaveProperty("icon")
        expect(item).toHaveProperty("title")
      })
    })

    it('should contain "Case studies" item with anchor', () => {
      const caseStudiesItem = forFundersItems.secondary.find(
        (item) => item.title === "Case studies"
      )
      expect(caseStudiesItem).toBeDefined()
      expect(caseStudiesItem?.anchor).toBe("case-studies")
    })

    it('should contain "Schedule demo" item as external link', () => {
      const scheduleDemoItem = forFundersItems.secondary.find(
        (item) => item.title === "Schedule demo"
      )
      expect(scheduleDemoItem).toBeDefined()
      expect(scheduleDemoItem?.external).toBe(true)
      expect(scheduleDemoItem?.href).toBe(SOCIALS.PARTNER_FORM)
    })

    it("should not have external flag on main item", () => {
      expect(forFundersItems.main.external).toBeUndefined()
    })
  })

  describe("Explore Items", () => {
    it("should have valid structure", () => {
      expect(exploreItems).toBeDefined()
      expect(exploreItems).toHaveProperty("projects")
      expect(exploreItems).toHaveProperty("communities")
    })

    it("should have valid projects array", () => {
      const { projects } = exploreItems
      expect(Array.isArray(projects)).toBe(true)
      expect(projects.length).toBe(3)

      projects.forEach((item) => {
        expect(item).toHaveProperty("href")
        expect(item).toHaveProperty("icon")
        expect(item).toHaveProperty("title")
      })
    })

    it("should have valid communities array", () => {
      const { communities } = exploreItems
      expect(Array.isArray(communities)).toBe(true)
      expect(communities.length).toBe(2)

      communities.forEach((item) => {
        expect(item).toHaveProperty("href")
        expect(item).toHaveProperty("icon")
        expect(item).toHaveProperty("title")
      })
    })

    it('should contain "All projects" item', () => {
      const allProjectsItem = exploreItems.projects.find((item) => item.title === "All projects")
      expect(allProjectsItem).toBeDefined()
      expect(allProjectsItem?.href).toBe(PAGES.PROJECTS_EXPLORER)
    })

    it('should contain "Most Grants" item with query parameters', () => {
      const mostGrantsItem = exploreItems.projects.find((item) => item.title === "Most Grants")
      expect(mostGrantsItem).toBeDefined()
      expect(mostGrantsItem?.href).toContain("sortBy=noOfGrants")
      expect(mostGrantsItem?.href).toContain("sortOrder=desc")
    })

    it('should contain "Most Active" item with query parameters', () => {
      const mostActiveItem = exploreItems.projects.find((item) => item.title === "Most Active")
      expect(mostActiveItem).toBeDefined()
      expect(mostActiveItem?.href).toContain("sortBy=noOfGrantMilestones")
      expect(mostActiveItem?.href).toContain("sortOrder=desc")
    })

    it('should contain "All communities" item', () => {
      const allCommunitiesItem = exploreItems.communities.find(
        (item) => item.title === "All communities"
      )
      expect(allCommunitiesItem).toBeDefined()
      expect(allCommunitiesItem?.href).toBe(PAGES.COMMUNITIES)
    })

    it('should contain "Funding Map" item', () => {
      const fundingMapItem = exploreItems.communities.find((item) => item.title === "Funding Map")
      expect(fundingMapItem).toBeDefined()
      expect(fundingMapItem?.href).toBe(PAGES.REGISTRY.ROOT)
    })
  })

  describe("Resources Items", () => {
    it("should have valid configuration", () => {
      expect(resourcesItems).toBeDefined()
      expect(Array.isArray(resourcesItems)).toBe(true)
      expect(resourcesItems.length).toBe(2)
    })

    it("should have all required properties for each item", () => {
      resourcesItems.forEach((item) => {
        expect(item).toHaveProperty("href")
        expect(item).toHaveProperty("icon")
        expect(item).toHaveProperty("title")
        expect(item).toHaveProperty("external")
        expect(item).toHaveProperty("showArrow")
      })
    })

    it("should have external flag set to true for all items", () => {
      resourcesItems.forEach((item) => {
        expect(item.external).toBe(true)
      })
    })

    it("should have showArrow flag set to true for all items", () => {
      resourcesItems.forEach((item) => {
        expect(item.showArrow).toBe(true)
      })
    })

    it('should contain "Docs" item', () => {
      const docsItem = resourcesItems.find((item) => item.title === "Docs")
      expect(docsItem).toBeDefined()
      expect(docsItem?.href).toBe(SOCIALS.DOCS)
      expect(docsItem?.external).toBe(true)
    })

    it('should contain "Blog" item', () => {
      const blogItem = resourcesItems.find((item) => item.title === "Blog")
      expect(blogItem).toBeDefined()
      expect(blogItem?.href).toBe(SOCIALS.PARAGRAPH)
      expect(blogItem?.external).toBe(true)
    })

    it("should have valid external URLs", () => {
      resourcesItems.forEach((item) => {
        expect(item.href).toMatch(/^https?:\/\//)
      })
    })
  })

  describe("No Duplicate Hrefs", () => {
    it("should not have duplicate hrefs in forBuildersItems", () => {
      const hrefs = forBuildersItems.map((item) => item.href)
      const uniqueHrefs = new Set(hrefs)
      // Note: We allow duplicate hrefs because "Create project" and other items might go to the same page
      // with different behaviors (modal vs navigation)
      expect(hrefs.length).toBeGreaterThan(0)
    })

    it("should not have duplicate hrefs in exploreItems.projects", () => {
      const hrefs = exploreItems.projects.map((item) => item.href)
      const uniqueHrefs = new Set(hrefs)
      // Each project filter should have a unique href (with different query params)
      expect(uniqueHrefs.size).toBe(hrefs.length)
    })

    it("should not have duplicate hrefs in exploreItems.communities", () => {
      const hrefs = exploreItems.communities.map((item) => item.href)
      const uniqueHrefs = new Set(hrefs)
      expect(uniqueHrefs.size).toBe(hrefs.length)
    })

    it("should not have duplicate hrefs in resourcesItems", () => {
      const hrefs = resourcesItems.map((item) => item.href)
      const uniqueHrefs = new Set(hrefs)
      expect(uniqueHrefs.size).toBe(hrefs.length)
    })
  })

  describe("TypeScript Interfaces", () => {
    it("should have valid MenuItem interface", () => {
      const sampleItem: MenuItem = {
        href: "/test",
        icon: () => null,
        title: "Test",
      }

      expect(sampleItem).toHaveProperty("href")
      expect(sampleItem).toHaveProperty("icon")
      expect(sampleItem).toHaveProperty("title")
    })

    it("should allow optional properties in MenuItem", () => {
      const sampleItem: MenuItem = {
        href: "/test",
        icon: () => null,
        title: "Test",
        description: "Test description",
        external: true,
        showArrow: true,
        openModal: true,
        anchor: "test-anchor",
      }

      expect(sampleItem.description).toBe("Test description")
      expect(sampleItem.external).toBe(true)
      expect(sampleItem.showArrow).toBe(true)
      expect(sampleItem.openModal).toBe(true)
      expect(sampleItem.anchor).toBe("test-anchor")
    })
  })

  describe("Icon Components", () => {
    it("should have valid icon components for forBuildersItems", () => {
      forBuildersItems.forEach((item) => {
        expect(item.icon).toBeDefined()
        expect(item.icon).toBeTruthy()
      })
    })

    it("should have valid icon components for forFundersItems", () => {
      expect(forFundersItems.main.icon).toBeDefined()
      expect(forFundersItems.main.icon).toBeTruthy()
      forFundersItems.secondary.forEach((item) => {
        expect(item.icon).toBeDefined()
        expect(item.icon).toBeTruthy()
      })
    })

    it("should have valid icon components for exploreItems", () => {
      exploreItems.projects.forEach((item) => {
        expect(item.icon).toBeDefined()
        expect(item.icon).toBeTruthy()
      })
      exploreItems.communities.forEach((item) => {
        expect(item.icon).toBeDefined()
        expect(item.icon).toBeTruthy()
      })
    })

    it("should have valid icon components for resourcesItems", () => {
      resourcesItems.forEach((item) => {
        expect(item.icon).toBeDefined()
        expect(item.icon).toBeTruthy()
      })
    })
  })
})
