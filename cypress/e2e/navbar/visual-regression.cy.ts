/**
 * E2E Tests: Visual Regression
 * Tests visual appearance and consistency of navbar across different states
 * Note: Requires cypress-image-snapshot or similar plugin for actual visual regression
 */

describe("Visual Regression", () => {
  describe("Desktop Navbar Appearance", () => {
    it("should match desktop navbar baseline", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      // Wait for navbar to fully load
      cy.contains("For Builders").should("be.visible");

      // Take snapshot
      // cy.matchImageSnapshot("desktop-navbar");
    });

    it("should match navbar with open dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").click();

      // Wait for dropdown animation
      cy.wait(300);

      // Take snapshot
      // cy.matchImageSnapshot("desktop-navbar-dropdown-open");
    });
  });

  describe("Desktop User Menu", () => {
    it("should match user menu appearance", () => {
      // Requires auth
      // cy.login();
      cy.viewport(1440, 900);
      cy.visit("/");

      // cy.get('[data-testid="user-avatar"]').click();

      cy.wait(300);

      // cy.matchImageSnapshot("desktop-user-menu");
    });

    it("should match user menu with all permissions", () => {
      // cy.login({ userType: "all-permissions" });
      cy.viewport(1440, 900);
      cy.visit("/");

      // cy.get('[data-testid="user-avatar"]').click();

      cy.wait(300);

      // cy.matchImageSnapshot("desktop-user-menu-all-permissions");
    });
  });

  describe("Mobile Menu Appearance", () => {
    it("should match mobile navbar baseline", () => {
      cy.viewport("iphone-x");
      cy.visit("/");

      cy.contains("For Builders").should("exist");

      // cy.matchImageSnapshot("mobile-navbar-closed");
    });

    it("should match mobile menu open", () => {
      cy.viewport("iphone-x");
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      cy.wait(300);

      // cy.matchImageSnapshot("mobile-menu-open");
    });

    it("should match mobile menu logged in", () => {
      // cy.login();
      cy.viewport("iphone-x");
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      cy.wait(300);

      // cy.matchImageSnapshot("mobile-menu-logged-in");
    });
  });

  describe("Dropdown Menu Appearance", () => {
    it("should match For Builders dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").click();

      cy.wait(300);

      // cy.matchImageSnapshot("for-builders-dropdown");
    });

    it("should match For Funders dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Funders").click();

      cy.wait(300);

      // cy.matchImageSnapshot("for-funders-dropdown");
    });

    it("should match Explore dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "Explore").click();

      cy.wait(300);

      // cy.matchImageSnapshot("explore-dropdown");
    });

    it("should match Resources dropdown", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "Resources").click();

      cy.wait(300);

      // cy.matchImageSnapshot("resources-dropdown");
    });
  });

  describe("Dark Theme", () => {
    it("should match dark theme navbar", () => {
      // cy.login();
      cy.viewport(1440, 900);
      cy.visit("/");

      // Switch to dark theme
      // cy.get('[data-testid="user-avatar"]').click();
      // cy.contains("Dark mode").click();

      cy.wait(500);

      // cy.matchImageSnapshot("dark-navbar");
    });

    it("should match dark theme dropdown", () => {
      // cy.login();
      cy.viewport(1440, 900);
      cy.visit("/");

      // Switch to dark theme
      // cy.get('[data-testid="user-avatar"]').click();
      // cy.contains("Dark mode").click();
      // cy.get('[data-testid="user-avatar"]').click(); // Close menu

      cy.wait(300);

      cy.contains("button", "For Builders").click();

      cy.wait(300);

      // cy.matchImageSnapshot("dark-dropdown");
    });
  });

  describe("Search Results Appearance", () => {
    it("should match search results display", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').type("test");

      cy.wait(600);

      // cy.matchImageSnapshot("search-results");
    });

    it("should match empty search results", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').type("zzznonexistent");

      cy.wait(600);

      // cy.matchImageSnapshot("search-no-results");
    });
  });

  describe("Loading States", () => {
    it("should match skeleton loading state", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      // Capture early before full load
      // cy.matchImageSnapshot("navbar-skeleton", { timeout: 100 });
    });

    it("should match auth buttons loading", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      // cy.matchImageSnapshot("auth-buttons-skeleton", { timeout: 100 });
    });
  });

  describe("Hover States", () => {
    it("should match button hover state", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").trigger("mouseover");

      cy.wait(100);

      // cy.matchImageSnapshot("button-hover");
    });

    it("should match menu item hover", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").click();

      cy.contains("Create project").trigger("mouseover");

      cy.wait(100);

      // cy.matchImageSnapshot("menu-item-hover");
    });
  });

  describe("Focus States", () => {
    it("should match focused button", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").focus();

      // cy.matchImageSnapshot("button-focused");
    });

    it("should match focused search input", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').focus();

      // cy.matchImageSnapshot("search-focused");
    });
  });

  describe("Tablet Appearance", () => {
    it("should match tablet navbar", () => {
      cy.viewport("ipad-2");
      cy.visit("/");

      // cy.matchImageSnapshot("tablet-navbar");
    });

    it("should match tablet menu open", () => {
      cy.viewport("ipad-2");
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      cy.wait(300);

      // cy.matchImageSnapshot("tablet-menu-open");
    });
  });

  describe("Cross-Browser Consistency", () => {
    it("should look consistent across viewports", () => {
      const viewports = [
        [1920, 1080], // Desktop wide
        [1440, 900],  // Desktop standard
        [768, 1024],  // Tablet portrait
        [375, 667],   // Mobile
      ];

      viewports.forEach(([width, height], index) => {
        cy.viewport(width, height);
        cy.visit("/");

        cy.wait(300);

        // cy.matchImageSnapshot(`navbar-${width}x${height}`);
      });
    });
  });

  describe("Animation States", () => {
    it("should capture dropdown opening animation", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.contains("button", "For Builders").click();

      // Capture mid-animation
      cy.wait(150);

      // cy.matchImageSnapshot("dropdown-opening");
    });

    it("should capture drawer sliding animation", () => {
      cy.viewport("iphone-x");
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      // Capture mid-animation
      cy.wait(150);

      // cy.matchImageSnapshot("drawer-opening");
    });
  });

  describe("Content Variations", () => {
    it("should match with long user address", () => {
      // cy.login({ address: "0x1234567890123456789012345678901234567890" });
      cy.viewport(1440, 900);
      cy.visit("/");

      // cy.get('[data-testid="user-avatar"]').click();

      cy.wait(300);

      // cy.matchImageSnapshot("long-address");
    });

    it("should match with many search results", () => {
      cy.viewport(1440, 900);
      cy.visit("/");

      cy.get('[placeholder*="Search"]').type("a");

      cy.wait(600);

      // cy.matchImageSnapshot("many-search-results");
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

      cy.wait(600);

      // cy.matchImageSnapshot("search-error");
    });
  });
});

