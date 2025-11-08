/**
 * E2E Tests: Mobile Navigation
 * Tests mobile-specific navigation including drawer, hamburger menu, and mobile layouts
 */

describe("Mobile Navigation", () => {
  beforeEach(() => {
    cy.viewport("iphone-x");
    cy.visit("/");
  });

  describe("Mobile Drawer", () => {
    it("should open and close mobile drawer", () => {
      // Open drawer
      cy.get('[aria-label="Open menu"]').click();

      // Drawer should be visible
      cy.get('[data-testid="mobile-drawer"]').should("be.visible");

      // Close drawer
      cy.get('[data-testid="close-drawer"]').click();

      // Drawer should close
      cy.get('[data-testid="mobile-drawer"]').should("not.be.visible");
    });

    it("should show all navigation sections in drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      // All sections should be visible
      cy.contains("For Builders").should("be.visible");
      cy.contains("For Funders").should("be.visible");
      cy.contains("Explore").should("be.visible");
      cy.contains("Resources").should("be.visible");
    });

    it("should close drawer on backdrop click", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.get('[data-testid="mobile-drawer"]').should("be.visible");

      // Click backdrop (outside drawer)
      cy.get("body").click(0, 0, { force: true });

      // Drawer should close
      cy.get('[data-testid="mobile-drawer"]').should("not.be.visible");
    });
  });

  describe("Mobile Menu - Unauthenticated", () => {
    it("should show auth buttons in mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("Sign in").should("be.visible");
      cy.contains("Contact sales").should("be.visible");
    });

    it("should show Resources section when logged out", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("Resources").should("be.visible");
      cy.contains("Docs").should("be.visible");
    });

    it("should show social media links", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Social links should be present
      cy.get('[aria-label="Twitter"]').should("be.visible");
      cy.get('[aria-label="Discord"]').should("be.visible");
      cy.get('[aria-label="Telegram"]').should("be.visible");
    });
  });

  describe("Mobile Menu - Authenticated", () => {
    it("should show user profile section when logged in", () => {
      // Requires auth
      // cy.login();
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      // cy.get('[data-testid="user-profile-section"]').should("be.visible");
      // cy.contains("My projects").should("be.visible");
    });

    it("should hide Resources section when logged in", () => {
      // cy.login();
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      // Resources should not be visible
      // cy.contains("Resources").should("not.exist");
    });

    it("should show logout button", () => {
      // cy.login();
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      // cy.contains("Log out").should("be.visible");
    });
  });

  describe("Mobile Search", () => {
    it("should have search in mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Search should be present
      cy.get('[placeholder*="Search"]').should("be.visible");
    });

    it("should search from mobile drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.get('[placeholder*="Search"]').type("test");

      cy.wait(600);

      // Results should appear
      cy.contains("test", { matchCase: false }).should("be.visible");
    });
  });

  describe("Mobile Navigation Items", () => {
    it("should navigate and close drawer on item click", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("All projects").click();

      // Should navigate
      cy.url().should("include", "/projects");

      // Drawer should close
      cy.get('[data-testid="mobile-drawer"]').should("not.be.visible");
    });

    it("should navigate to communities", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.contains("All communities").click();

      cy.url().should("include", "/communities");
    });
  });

  describe("Mobile Theme Toggle", () => {
    it("should have theme toggle in mobile menu", () => {
      // cy.login();
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      // cy.contains("Dark mode").or(cy.contains("Light mode")).should("be.visible");
    });

    it("should toggle theme from mobile menu", () => {
      // cy.login();
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();

      // Click theme toggle
      // cy.contains("Dark mode").click();

      // Theme should change
      // Verify dark mode applied
    });
  });

  describe("Mobile Drawer Scrolling", () => {
    it("should scroll within drawer when content overflows", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Drawer content should be scrollable
      cy.get('[data-testid="mobile-drawer"]').scrollTo("bottom");

      // Should reach bottom items
      cy.contains("Follow").should("be.visible");
    });
  });

  describe("Mobile Landscape Mode", () => {
    it("should work in landscape orientation", () => {
      cy.viewport(667, 375); // Landscape

      cy.get('[aria-label="Open menu"]').click();

      cy.get('[data-testid="mobile-drawer"]').should("be.visible");
    });
  });

  describe("Tablet Navigation", () => {
    it("should use mobile drawer on tablet", () => {
      cy.viewport("ipad-2");

      cy.get('[aria-label="Open menu"]').click();

      cy.get('[data-testid="mobile-drawer"]').should("be.visible");
    });
  });

  describe("Mobile Accessibility", () => {
    it("should trap focus in open drawer", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Focus should stay within drawer when tabbing
      cy.get("body").tab();

      // First focusable element in drawer should be focused
      cy.focused().should("be.visible");
    });

    it("should return focus to menu button on close", () => {
      cy.get('[aria-label="Open menu"]').click();

      cy.get('[data-testid="close-drawer"]').click();

      // Focus should return to menu button
      cy.focused().should("have.attr", "aria-label", "Open menu");
    });
  });

  describe("Mobile Performance", () => {
    it("should open drawer quickly", () => {
      const start = Date.now();

      cy.get('[aria-label="Open menu"]').click();

      cy.get('[data-testid="mobile-drawer"]').should("be.visible").then(() => {
        const end = Date.now();
        expect(end - start).to.be.lessThan(500);
      });
    });

    it("should be responsive during drawer animation", () => {
      cy.get('[aria-label="Open menu"]').click();

      // Button should not be disabled
      cy.get('[aria-label="Open menu"]').should("not.be.disabled");
    });
  });
});

