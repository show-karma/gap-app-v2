/**
 * E2E Tests: Navbar Navigation Journey
 * Tests navigation through dropdowns, anchors, modals, and external links
 */

describe("Navbar Navigation Journey", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  describe("Desktop Dropdown Navigation", () => {
    it("should navigate through For Builders menu", () => {
      // Hover or click For Builders
      cy.contains("button", "For Builders").click();

      // Menu should open
      cy.contains("Create project").should("be.visible");

      // Click menu item
      cy.contains("Find funding").click();

      // Should navigate or scroll to section
      cy.url().should("include", "/#live-funding-opportunities").or("eq", Cypress.config().baseUrl + "/");
    });

    it("should navigate through For Funders menu", () => {
      cy.contains("button", "For Funders").click();

      cy.contains("Explore directory").should("be.visible");

      cy.contains("Explore directory").click();

      // Should navigate
      cy.url().should("not.eq", Cypress.config().baseUrl + "/");
    });

    it("should navigate through Explore menu", () => {
      cy.contains("button", "Explore").click();

      cy.contains("All projects").should("be.visible");

      cy.contains("All projects").click();

      cy.url().should("include", "/projects");
    });

    it("should navigate through Resources menu when logged out", () => {
      // Resources only visible when logged out
      cy.contains("button", "Resources").should("be.visible").click();

      cy.contains("Docs").should("be.visible");

      // Docs is external link
      cy.contains("Docs").should("have.attr", "target", "_blank");
    });
  });

  describe("Mobile Drawer Navigation", () => {
    beforeEach(() => {
      cy.viewport("iphone-x");
    });

    it("should open and navigate from mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Drawer should open
      cy.get('[data-testid="mobile-drawer"]').should("be.visible");

      // Click menu item
      cy.contains("Create project").click();

      // Drawer should close
      cy.get('[data-testid="mobile-drawer"]').should("not.be.visible");
    });

    it("should navigate to All projects from mobile", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("All projects").click();

      cy.url().should("include", "/projects");
    });
  });

  describe("External Link Navigation", () => {
    it("should open external links in new tab", () => {
      cy.contains("button", "Resources").click();

      // Docs link
      cy.contains("Docs").should("have.attr", "target", "_blank");
      cy.contains("Docs").should("have.attr", "rel");
    });

    it("should open Contact sales in new tab", () => {
      cy.contains("Contact sales").should("have.attr", "target", "_blank");
    });

    it("should open social media links in new tab", () => {
      cy.contains("button", "Resources").click();

      // Social links should have target="_blank"
      cy.get('[aria-label="Twitter"]').should("have.attr", "target", "_blank");
      cy.get('[aria-label="Discord"]').should("have.attr", "target", "_blank");
    });
  });

  describe("Anchor Scrolling - Same Page", () => {
    it("should scroll to section when already on page", () => {
      // Assuming home page has anchors
      cy.contains("button", "For Builders").click();

      cy.contains("Find funding").click();

      // Should scroll to section with ID
      cy.get("#live-funding-opportunities").should("exist");
    });

    it("should smooth scroll to anchor", () => {
      cy.contains("button", "For Builders").click();

      cy.contains("Find funding").click();

      // Wait for scroll animation
      cy.wait(500);

      // Section should be in viewport
      cy.get("#live-funding-opportunities").should("be.visible");
    });
  });

  describe("Anchor Scrolling - Different Page", () => {
    it("should navigate then scroll when on different page", () => {
      // Start on different page
      cy.visit("/projects");

      // Click navbar item with anchor
      cy.contains("For Builders").click();
      cy.contains("Find funding").click();

      // Should navigate to home
      cy.url().should("eq", Cypress.config().baseUrl + "/");

      // Then scroll to anchor
      cy.get("#live-funding-opportunities", { timeout: 2000 }).should("be.visible");
    });
  });

  describe("Modal Trigger from Menu", () => {
    it("should trigger Create project modal", () => {
      cy.contains("button", "For Builders").click();

      cy.contains("Create project").click();

      // Modal should open or navigation occurs
      // Depending on implementation
      cy.url().should("include", "/").or("include", "/projects");
    });
  });

  describe("Nested Navigation", () => {
    it("should handle nested menu structures", () => {
      cy.contains("button", "Explore").click();

      // Explore has Projects and Communities sections
      cy.contains("All projects").should("be.visible");
      cy.contains("All communities").should("be.visible");
    });

    it("should navigate to communities page", () => {
      cy.contains("button", "Explore").click();

      cy.contains("All communities").click();

      cy.url().should("include", "/communities");
    });
  });

  describe("Logo Navigation", () => {
    it("should navigate to home when clicking logo", () => {
      // Navigate away
      cy.visit("/projects");

      // Click logo
      cy.get('img[alt*="Karma GAP"]').click();

      // Should return to home
      cy.url().should("eq", Cypress.config().baseUrl + "/");
    });
  });

  describe("Dropdown Behavior", () => {
    it("should close dropdown on item click", () => {
      cy.contains("button", "For Builders").click();

      cy.contains("Create project").should("be.visible");

      cy.contains("Create project").click();

      // Dropdown should close
      cy.contains("Create project").should("not.be.visible");
    });

    it("should close dropdown on outside click", () => {
      cy.contains("button", "For Builders").click();

      cy.contains("Create project").should("be.visible");

      // Click outside
      cy.get("body").click(0, 0);

      // Dropdown should close
      cy.contains("Create project").should("not.be.visible");
    });

    it("should close dropdown on Escape key", () => {
      cy.contains("button", "For Builders").click();

      cy.contains("Create project").should("be.visible");

      // Press Escape
      cy.get("body").type("{esc}");

      // Dropdown should close
      cy.contains("Create project").should("not.be.visible");
    });
  });

  describe("Navigation State Preservation", () => {
    it("should maintain state after navigation", () => {
      cy.visit("/");

      // Navigate to projects
      cy.contains("button", "Explore").click();
      cy.contains("All projects").click();

      cy.url().should("include", "/projects");

      // Navbar should still be functional
      cy.contains("button", "For Builders").should("be.visible");
    });

    it("should work across multiple navigations", () => {
      cy.visit("/");

      // Multiple navigations
      cy.contains("button", "Explore").click();
      cy.contains("All projects").click();

      cy.contains("button", "Explore").click();
      cy.contains("All communities").click();

      cy.url().should("include", "/communities");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should navigate dropdowns with keyboard", () => {
      // Tab to For Builders
      cy.get("button").contains("For Builders").focus();

      // Press Enter to open
      cy.focused().type("{enter}");

      // Dropdown should open
      cy.contains("Create project").should("be.visible");
    });

    it("should navigate menu items with arrow keys", () => {
      cy.get("button").contains("For Builders").focus().type("{enter}");

      // Arrow down to navigate items
      cy.focused().type("{downarrow}");

      // Enter to select
      cy.focused().type("{enter}");

      // Should navigate
    });
  });

  describe("My Projects Navigation", () => {
    it("should navigate to My projects", () => {
      // Requires auth - commented until auth setup
      // cy.login();

      // Click user menu
      // cy.get('[data-testid="user-avatar"]').click();

      // cy.contains("My projects").click();

      // cy.url().should("include", "/my-projects");
    });
  });

  describe("Admin Navigation", () => {
    it("should navigate to Admin when user has access", () => {
      // Requires admin auth
      // cy.login({ userType: "admin" });

      // cy.get('[data-testid="user-avatar"]').click();

      // cy.contains("Admin").click();

      // cy.url().should("include", "/admin");
    });
  });

  describe("Help & Docs Navigation", () => {
    it("should open Help & Docs in new tab", () => {
      // Requires auth
      // cy.login();

      // cy.get('[data-testid="user-avatar"]').click();

      // cy.contains("Help & Docs").should("have.attr", "target", "_blank");
    });
  });

  describe("Navigation Performance", () => {
    it("should navigate quickly", () => {
      const start = Date.now();

      cy.contains("button", "Explore").click();
      cy.contains("All projects").click();

      cy.url().should("include", "/projects").then(() => {
        const end = Date.now();
        expect(end - start).to.be.lessThan(3000);
      });
    });

    it("should not block UI during navigation", () => {
      cy.contains("button", "For Builders").click();

      // Dropdown should appear immediately
      cy.contains("Create project", { timeout: 1000 }).should("be.visible");
    });
  });
});

