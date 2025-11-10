/**
 * Unit tests for NavbarSearch component
 * Tests: Rendering, input behavior, debouncing, API integration, results display, dropdown management
 */

import React from "react";
import { screen, waitFor, within, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarSearch } from "@/src/components/navbar/navbar-search";
import { renderWithProviders, waitForDebounce, simulateClickOutside } from "../utils/test-helpers";
import { server } from "../setup";
import {
  searchFixtures,
  emptySearchResults,
  projectsOnlyResults,
  communitiesOnlyResults,
  mixedResults,
  largeResultSet,
  searchQueries,
} from "../fixtures/search-fixtures";
import { scenarioHandlers, createSearchHandler, createCustomSearchHandler } from "../mocks/handlers";
import { http, HttpResponse } from "msw";

// Mock gapIndexerApi
jest.mock("@/utilities/gapIndexerApi", () => ({
  gapIndexerApi: {
    search: jest.fn(),
  },
}));

// Mock groupSimilarCommunities
jest.mock("@/utilities/communityHelpers", () => ({
  groupSimilarCommunities: jest.fn((communities) => communities),
}));

// Helper to flush timers and promises
const flushTimersAndPromises = async () => {
  await act(async () => {
    jest.runAllTimers();
    // Flush promise queue
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("NavbarSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Rendering and Initial State", () => {
    it("renders the search input field", () => {
      renderWithProviders(<NavbarSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      expect(searchInput).toBeInTheDocument();
    });

    it("renders the search icon", () => {
      const { container } = renderWithProviders(<NavbarSearch />);
      
      const searchIcon = container.querySelector('svg');
      expect(searchIcon).toBeInTheDocument();
    });

    it("has correct placeholder text", () => {
      renderWithProviders(<NavbarSearch />);
      
      const searchInput = screen.getByPlaceholderText("Search Project/Community");
      expect(searchInput).toBeInTheDocument();
    });

    it("dropdown is closed by default", () => {
      renderWithProviders(<NavbarSearch />);
      
      const dropdown = screen.queryByText(/no results found/i);
      expect(dropdown).not.toBeInTheDocument();
    });

    it("input is not disabled", () => {
      renderWithProviders(<NavbarSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      expect(searchInput).not.toBeDisabled();
    });

    it("input starts with empty value", () => {
      renderWithProviders(<NavbarSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search project\/community/i) as HTMLInputElement;
      expect(searchInput.value).toBe("");
    });

    it("has proper container styling classes", () => {
      const { container } = renderWithProviders(<NavbarSearch />);
      
      const wrapper = container.querySelector('.relative');
      expect(wrapper).toHaveClass('relative');
    });
  });

  describe("Input Behavior", () => {
    it("typing updates input value", async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProviders(<NavbarSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      await user.type(searchInput, "test");
      
      expect(searchInput).toHaveValue("test");
    });

    it("onChange event handler works", async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProviders(<NavbarSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      await user.type(searchInput, "project");
      
      expect(searchInput).toHaveValue("project");
    });

    it("accepts all characters", async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProviders(<NavbarSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      const specialChars = "Test123!@#$%";
      
      await user.type(searchInput, specialChars);
      expect(searchInput).toHaveValue(specialChars);
    });

    it("can clear input value", async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProviders(<NavbarSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      await user.type(searchInput, "test");
      expect(searchInput).toHaveValue("test");
      
      await user.clear(searchInput);
      expect(searchInput).toHaveValue("");
    });

    it("handles rapid typing", async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProviders(<NavbarSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      await user.type(searchInput, "abcdefghij");
      
      expect(searchInput).toHaveValue("abcdefghij");
    });
  });

  describe("Debouncing Tests", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("search triggers after 500ms delay", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: mixedResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "project" } });
      
      // Should not call immediately
      expect(gapIndexerApi.search).not.toHaveBeenCalled();
      
      // Advance timers by 500ms
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      // Should call after debounce
      await waitFor(() => {
        expect(gapIndexerApi.search).toHaveBeenCalledWith("project");
      });
    });

    it("multiple rapid keystrokes result in single API call", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: mixedResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      // Type multiple characters rapidly without advancing time between them
      fireEvent.change(searchInput, { target: { value: "pro" } });
      fireEvent.change(searchInput, { target: { value: "proj" } });
      fireEvent.change(searchInput, { target: { value: "proje" } });
      fireEvent.change(searchInput, { target: { value: "project" } });
      
      // Verify no calls have been made yet (still in debounce window)
      expect(gapIndexerApi.search).not.toHaveBeenCalled();
      
      // Advance to complete debounce (500ms)
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      // Wait for async operations to complete
      await waitFor(() => {
        expect(gapIndexerApi.search).toHaveBeenCalled();
      });
      
      // Should only call once with final value
      expect(gapIndexerApi.search).toHaveBeenCalledTimes(1);
      expect(gapIndexerApi.search).toHaveBeenCalledWith("project");
    });

    it("debounce timer resets on each keystroke", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: mixedResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      // Type first value and advance almost to debounce completion
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(400)); // Not enough to trigger (need 500ms)
      
      // No call should have been made yet
      expect(gapIndexerApi.search).not.toHaveBeenCalled();
      
      // Type again - this resets the timer
      fireEvent.change(searchInput, { target: { value: "testing" } });
      act(() => jest.advanceTimersByTime(400)); // Again, not enough
      
      // Still no call
      expect(gapIndexerApi.search).not.toHaveBeenCalled();
      
      // Now complete the debounce from the last keystroke
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      // Wait for async operation
      await waitFor(() => {
        expect(gapIndexerApi.search).toHaveBeenCalled();
      });
      
      // Should only call once with final value
      expect(gapIndexerApi.search).toHaveBeenCalledTimes(1);
      expect(gapIndexerApi.search).toHaveBeenCalledWith("testing");
    });

    it("search executes after typing stops", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "awesome" } });
      
      // Immediately after typing
      expect(gapIndexerApi.search).not.toHaveBeenCalled();
      
      // After debounce delay
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      await waitFor(() => {
        expect(gapIndexerApi.search).toHaveBeenCalledWith("awesome");
      });
    });
  });

  describe("Minimum Character Tests", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it("less than 3 characters: no API call", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: mixedResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "ab" } });
      act(() => jest.advanceTimersByTime(500));
      
      expect(gapIndexerApi.search).not.toHaveBeenCalled();
    });

    it("exactly 3 characters: triggers search", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "pro" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        expect(gapIndexerApi.search).toHaveBeenCalledWith("pro");
      });
    });

    it("more than 3 characters: continues searching", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: mixedResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "project" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        expect(gapIndexerApi.search).toHaveBeenCalledWith("project");
      });
    });

    it("results clear when below 3 characters", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      // Use real timers for this test since it involves async state updates
      jest.useRealTimers();
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      // First, type enough characters to trigger search
      fireEvent.change(searchInput, { target: { value: "test" } });
      
      await waitFor(() => {
        expect(gapIndexerApi.search).toHaveBeenCalled();
      }, { timeout: 1000 });
      
      // Then reduce to less than 3 characters
      gapIndexerApi.search.mockClear();
      fireEvent.change(searchInput, { target: { value: "te" } });
      
      // Wait for any potential debounce (there shouldn't be an API call)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });
      
      // Should not trigger new search
      expect(gapIndexerApi.search).not.toHaveBeenCalled();
      
      // Restore fake timers for other tests
      jest.useFakeTimers();
    });
  });

  describe("Loading State Tests", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it("loading spinner shows during API call", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mixedResults }), 1000))
      );
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      
      // Spinner should be visible
      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });

    it("dropdown opens with spinner", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mixedResults }), 1000))
      );
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "project" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        const dropdown = document.querySelector('.absolute.top-full');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it("spinner disappears when results arrive", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      
      // Wait for results to load
      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();
      });
    });
  });

  describe("API Integration Tests", () => {
    // Don't use fake timers for these tests - they need real async behavior
    it("successful search response displays results", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      // Type search value
      fireEvent.change(searchInput, { target: { value: "awesome" } });
      
      // First verify the API gets called
      await waitFor(() => {
        expect(gapIndexerApi.search).toHaveBeenCalledWith("awesome");
      }, { timeout: 1000 });
      
      // Then wait for results to appear
      await waitFor(() => {
        expect(screen.getByText("Awesome Project")).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it("empty results show 'No results found' message", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: emptySearchResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });

    it("API error shows error state (no crash)", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockRejectedValue(new Error("API Error"));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      
      // Component should not crash
      await waitFor(() => {
        expect(searchInput).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });

    it("network timeout handled gracefully", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
      );
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      
      // Advance to timeout
      act(() => jest.advanceTimersByTime(5000));
      
      await waitFor(() => {
        // Should handle gracefully
        expect(searchInput).toBeInTheDocument();
      });
    });
  });

  describe("Results Display Tests", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it("project results render with correct data", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "project" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        expect(screen.getByText("Awesome Project")).toBeInTheDocument();
        expect(screen.getByText("Cool Dapp")).toBeInTheDocument();
        expect(screen.getByText("Web3 Tool")).toBeInTheDocument();
      });
    });

    it("community results render with 'Community' badge", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: communitiesOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "optimism" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        expect(screen.getByText("Optimism")).toBeInTheDocument();
        const badges = screen.getAllByText("Community");
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it("mixed results show both types", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: mixedResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        // Projects
        expect(screen.getByText("DeFi Protocol")).toBeInTheDocument();
        expect(screen.getByText("NFT Marketplace")).toBeInTheDocument();
        
        // Communities
        expect(screen.getByText("Ethereum")).toBeInTheDocument();
        expect(screen.getByText("Community")).toBeInTheDocument();
      });
    });

    it("results are scrollable when many", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: largeResultSet });
      
      const { container } = renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        const scrollContainer = container.querySelector('.overflow-y-auto');
        expect(scrollContainer).toBeInTheDocument();
      });
    });
  });

  describe("Results Interaction Tests", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it("clicking result closes dropdown", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "project" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        const result = screen.getByText("Awesome Project");
        fireEvent.click(result);
      });
      
      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText("Cool Dapp")).not.toBeInTheDocument();
      });
    });

    it("search value clears after selection", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i) as HTMLInputElement;
      
      fireEvent.change(searchInput, { target: { value: "project" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        const result = screen.getByText("Awesome Project");
        fireEvent.click(result);
      });
      
      expect(searchInput.value).toBe("");
    });
  });

  describe("Dropdown Management Tests", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it("dropdown opens when results available", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        const dropdown = document.querySelector('.absolute.top-full');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it("dropdown stays open while typing", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        expect(screen.getByText("Awesome Project")).toBeInTheDocument();
      });
      
      // Type more
      fireEvent.change(searchInput, { target: { value: "testing" } });
      
      // Dropdown should still be visible
      expect(screen.getByText("Awesome Project")).toBeInTheDocument();
    });

    it("opens on focus if results exist", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      // First search
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        expect(screen.getByText("Awesome Project")).toBeInTheDocument();
      });
      
      // Click result to close
      fireEvent.click(screen.getByText("Awesome Project"));
      
      await waitFor(() => {
        expect(screen.queryByText("Cool Dapp")).not.toBeInTheDocument();
      });
      
      // Type again to get results
      fireEvent.change(searchInput, { target: { value: "test2" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        expect(screen.getByText("Awesome Project")).toBeInTheDocument();
      });
      
      // Focus should reopen if results exist
      fireEvent.focus(searchInput);
      expect(screen.getByText("Awesome Project")).toBeInTheDocument();
    });
  });

  describe("Click Outside Tests", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it("click outside closes dropdown", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        expect(screen.getByText("Awesome Project")).toBeInTheDocument();
      });
      
      // Click outside
      fireEvent.mouseDown(document.body);
      
      await waitFor(() => {
        expect(screen.queryByText("Awesome Project")).not.toBeInTheDocument();
      });
    });

    it("click on search input doesn't close dropdown", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        expect(screen.getByText("Awesome Project")).toBeInTheDocument();
      });
      
      // Click on input
      fireEvent.mouseDown(searchInput);
      
      // Dropdown should still be visible
      expect(screen.getByText("Awesome Project")).toBeInTheDocument();
    });
  });

  describe("Accessibility Tests", () => {
    it("input has proper placeholder for screen readers", () => {
      renderWithProviders(<NavbarSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      expect(searchInput).toBeInTheDocument();
    });

    it("results are keyboard navigable", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      jest.useFakeTimers();
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(500));
      jest.useRealTimers();
      
      await waitFor(() => {
        const results = screen.getAllByRole('link');
        expect(results.length).toBeGreaterThan(0);
      });
    });

    it("search input is focusable", () => {
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
    });
  });
});

