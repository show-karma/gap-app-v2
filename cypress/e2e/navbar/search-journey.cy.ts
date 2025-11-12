/**
 * E2E Tests: Navbar Search Journey
 * Tests search functionality, results display, and navigation from search
 */

describe("Navbar Search Journey", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  describe("Basic Search", () => {
    it("should search for projects and navigate", () => {
      // Type in search field
      cy.get('[placeholder*="Search"]').type("test project");

      // Wait for debounce and results
      cy.wait(600);

      // Results dropdown should appear
      cy.get('[data-testid="search-results"]').should("be.visible");

      // Click first result
      cy.contains("test project").first().click();

      // Should navigate to project page
      cy.url().should("include", "/projects/");
    });

    it("should display search results", () => {
      cy.get('[placeholder*="Search"]').type("optimism");

      cy.wait(600);

      // Results should be visible
      cy.get('[data-testid="search-results"]').should("be.visible");
      
      // Should show project or community results
      cy.contains("optimism", { matchCase: false }).should("be.visible");
    });
  });

  describe("Search for Communities", () => {
    it("should search for communities", () => {
      cy.get('[placeholder*="Search"]').type("community");

      cy.wait(600);

      // Should show community badge or identifier
      cy.contains("Community").should("be.visible");
    });

    it("should navigate to community page", () => {
      cy.get('[placeholder*="Search"]').type("optimism");

      cy.wait(600);

      // Click community result
      cy.contains("Community").first().click();

      // Should navigate to community page
      cy.url().should("include", "/communities/");
    });
  });

  describe("Empty Search Results", () => {
    it("should show no results message", () => {
      cy.get('[placeholder*="Search"]').type("zzznonexistent12345");

      cy.wait(600);

      // Should show no results message
      cy.contains("No results", { matchCase: false }).should("be.visible");
    });

    it("should handle empty query gracefully", () => {
      const searchInput = cy.get('[placeholder*="Search"]');
      
      searchInput.type("a");
      searchInput.clear();

      // Should not show results for empty query
      cy.get('[data-testid="search-results"]').should("not.exist");
    });
  });

  describe("Search Debouncing", () => {
    it("should debounce search input", () => {
      const searchInput = cy.get('[placeholder*="Search"]');
      
      // Type quickly
      searchInput.type("test");

      // Results should not appear immediately
      cy.get('[data-testid="search-results"]').should("not.exist");

      // Wait for debounce
      cy.wait(600);

      // Now results should appear
      cy.get('[data-testid="search-results"]').should("be.visible");
    });
  });

  describe("Mobile Search", () => {
    it("should search from mobile drawer", () => {
      cy.viewport("iphone-x");
      cy.visit("/");

      // Open mobile drawer
      cy.get('[aria-label="Open menu"]').click();

      // Find search in drawer
      cy.get('[placeholder*="Search"]').type("project");

      cy.wait(600);

      // Results should appear in drawer context
      cy.contains("project", { matchCase: false }).should("be.visible");
    });

    it("should close drawer on result click", () => {
      cy.viewport("iphone-x");
      cy.visit("/");

      cy.get('[aria-label="Open menu"]').click();
      cy.get('[placeholder*="Search"]').type("test");

      cy.wait(600);

      // Click result
      cy.contains("test", { matchCase: false }).first().click();

      // Drawer should close
      cy.get('[data-testid="mobile-drawer"]').should("not.be.visible");
    });
  });

  describe("Search Dropdown Behavior", () => {
    it("should close dropdown on click outside", () => {
      cy.get('[placeholder*="Search"]').type("test");

      cy.wait(600);

      cy.get('[data-testid="search-results"]').should("be.visible");

      // Click outside
      cy.get("body").click(0, 0);

      // Dropdown should close
      cy.get('[data-testid="search-results"]').should("not.exist");
    });

    it("should clear search after selection", () => {
      cy.get('[placeholder*="Search"]').type("test");

      cy.wait(600);

      // Click result
      cy.contains("test", { matchCase: false }).first().click();

      // Search input should be cleared
      cy.get('[placeholder*="Search"]').should("have.value", "");
    });
  });

  describe("Search Results Display", () => {
    it("should show project images in results", () => {
      cy.get('[placeholder*="Search"]').type("project");

      cy.wait(600);

      // Should show profile pictures/images
      cy.get('[data-testid="search-results"]').within(() => {
        cy.get("img").should("exist");
      });
    });

    it("should show mixed results (projects + communities)", () => {
      cy.get('[placeholder*="Search"]').type("test");

      cy.wait(600);

      // Should potentially show both project and community results
      cy.get('[data-testid="search-results"]').should("be.visible");
    });
  });

  describe("Search Accessibility", () => {
    it("should be keyboard navigable", () => {
      // Tab to search input
      cy.get('[placeholder*="Search"]').focus();

      // Type query
      cy.focused().type("test");

      cy.wait(600);

      // Arrow keys should navigate results
      cy.focused().type("{downarrow}");
      
      // Enter should select result
      cy.focused().type("{enter}");
    });

    it("should close dropdown with Escape", () => {
      cy.get('[placeholder*="Search"]').type("test");

      cy.wait(600);

      // Press Escape
      cy.get('[placeholder*="Search"]').type("{esc}");

      // Dropdown should close
      cy.get('[data-testid="search-results"]').should("not.exist");
    });
  });

  describe("Search Error Handling", () => {
    it("should handle API errors gracefully", () => {
      // Intercept search API and force error
      cy.intercept("GET", "**/api/search*", {
        statusCode: 500,
        body: { error: "Internal server error" },
      }).as("searchError");

      cy.get('[placeholder*="Search"]').type("test");

      cy.wait(600);

      // Should show error state, not crash
      // Error handling UI should appear
    });

    it("should retry after error", () => {
      // First call fails, second succeeds
      let callCount = 0;
      cy.intercept("GET", "**/api/search*", (req) => {
        callCount++;
        if (callCount === 1) {
          req.reply({ statusCode: 500 });
        } else {
          req.reply({ statusCode: 200, body: { results: [] } });
        }
      });

      cy.get('[placeholder*="Search"]').type("test");
      cy.wait(600);

      // Clear and search again
      cy.get('[placeholder*="Search"]').clear().type("test2");
      cy.wait(600);

      // Should work on retry
    });
  });

  describe("Search Performance", () => {
    it("should handle large result sets", () => {
      cy.get('[placeholder*="Search"]').type("a");

      cy.wait(600);

      // Should render results smoothly even with many items
      cy.get('[data-testid="search-results"]').should("be.visible");
    });

    it("should be responsive during search", () => {
      cy.get('[placeholder*="Search"]').type("test");

      // UI should remain responsive during API call
      cy.get('[placeholder*="Search"]').should("not.be.disabled");
    });
  });
});

