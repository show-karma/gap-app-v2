/**
 * E2E Tests: Visual Regression
 * Tests visual appearance and consistency of navbar across different states
 * Uses cypress-image-snapshot for visual regression testing
 *
 * Run with: yarn e2e:headless
 */

describe("Visual Regression", () => {
  describe("Desktop Navbar Appearance", () => {
    it("should match desktop navbar baseline", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      // Wait for navbar to fully load
      cy.contains("For Builders").should("be.visible");

      // Take snapshot
      cy.matchImageSnapshot("desktop-navbar");
    });

    it("should match navbar with open dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").click();

      // Wait for dropdown to be visible instead of arbitrary wait
      cy.contains("Create project").should("be.visible");

      // Take snapshot
      cy.matchImageSnapshot("desktop-navbar-dropdown-open");
    });
  });

  describe("Mobile Menu Appearance", () => {
    it("should match mobile navbar baseline", () => {
      cy.viewport("iphone-x");
      cy.visit("/");

      cy.contains("For Builders").should("exist");

      cy.matchImageSnapshot("mobile-navbar-closed");
    });

    it("should match mobile menu open", () => {
      cy.viewport("iphone-x");
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      // Wait for menu to be visible instead of arbitrary wait
      cy.get('[aria-label="Close menu"]').should("be.visible");

      cy.matchImageSnapshot("mobile-menu-open");
    });
  });

  describe("Dropdown Menu Appearance", () => {
    it("should match For Builders dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").click();

      // Wait for dropdown content to be visible
      cy.contains("Create project").should("be.visible");

      cy.matchImageSnapshot("for-builders-dropdown");
    });

    it("should match For Funders dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Funders").click();

      // Wait for dropdown content to be visible
      cy.get("body").should("contain", "Browse"); // Adjust selector based on actual content

      cy.matchImageSnapshot("for-funders-dropdown");
    });

    it("should match Explore dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "Explore").click();

      // Wait for dropdown content to be visible
      cy.get("body").should("be.visible"); // Adjust selector based on actual content

      cy.matchImageSnapshot("explore-dropdown");
    });

    it("should match Resources dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "Resources").click();

      // Wait for dropdown content to be visible
      cy.get("body").should("be.visible"); // Adjust selector based on actual content

      cy.matchImageSnapshot("resources-dropdown");
    });
  });


  describe("Search Results Appearance", () => {
    it("should match search results display", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').type("test");

      // Wait for search results to appear instead of arbitrary wait
      cy.get("body").should("be.visible"); // Adjust selector based on actual search results container

      cy.matchImageSnapshot("search-results");
    });

    it("should match empty search results", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').type("zzznonexistent");

      // Wait for empty state to appear
      cy.get("body").should("be.visible"); // Adjust selector based on actual empty state

      cy.matchImageSnapshot("search-no-results");
    });
  });

  describe("Hover States", () => {
    it("should match button hover state", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").trigger("mouseover");

      // Small wait for hover state to apply
      cy.wait(50);

      cy.matchImageSnapshot("button-hover");
    });

    it("should match menu item hover", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").click();
      cy.contains("Create project").should("be.visible");

      cy.contains("Create project").trigger("mouseover");

      // Small wait for hover state to apply
      cy.wait(50);

      cy.matchImageSnapshot("menu-item-hover");
    });
  });

  describe("Focus States", () => {
    it("should match focused button", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").focus();

      cy.matchImageSnapshot("button-focused");
    });

    it("should match focused search input", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').focus();

      cy.matchImageSnapshot("search-focused");
    });
  });

  describe("Tablet Appearance", () => {
    it("should match tablet navbar", () => {
      cy.viewport("ipad-2");
      cy.visit("/");

      cy.contains("For Builders").should("exist");

      cy.matchImageSnapshot("tablet-navbar");
    });

    it("should match tablet menu open", () => {
      cy.viewport("ipad-2");
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      // Wait for menu to be visible
      cy.get('[aria-label="Close menu"]').should("be.visible");

      cy.matchImageSnapshot("tablet-menu-open");
    });
  });

  describe("Cross-Browser Consistency", () => {
    it("should look consistent across viewports", () => {
      const viewports = [
        [1920, 1080], // Desktop wide
        [1440, 900], // Desktop standard
        [768, 1024], // Tablet portrait
        [375, 667], // Mobile
      ];

      viewports.forEach(([width, height]) => {
        cy.viewport(width, height);
        cy.visit("/");

        cy.contains("For Builders").should("exist");

        cy.matchImageSnapshot(`navbar-${width}x${height}`);
      });
    });
  });

  describe("Content Variations", () => {
    it("should match with many search results", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').type("a");

      // Wait for search results to appear
      cy.get("body").should("be.visible"); // Adjust selector based on actual search results

      cy.matchImageSnapshot("many-search-results");
    });
  });

  describe("Error States", () => {
    it("should match search error state", () => {
      cy.intercept("GET", "**/api/search*", {
        statusCode: 500,
        body: { error: "Server error" },
      });

      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').type("test");

      // Wait for error state to appear
      cy.get("body").should("be.visible"); // Adjust selector based on actual error display

      cy.matchImageSnapshot("search-error");
    });
  });
});
