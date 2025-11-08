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
      
      // Type multiple characters rapidly
      fireEvent.change(searchInput, { target: { value: "p" } });
      act(() => jest.advanceTimersByTime(100));
      
      fireEvent.change(searchInput, { target: { value: "pr" } });
      act(() => jest.advanceTimersByTime(100));
      
      fireEvent.change(searchInput, { target: { value: "pro" } });
      act(() => jest.advanceTimersByTime(100));
      
      fireEvent.change(searchInput, { target: { value: "proj" } });
      
      // Advance to complete debounce
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      // Should only call once with final value
      await waitFor(() => {
        expect(gapIndexerApi.search).toHaveBeenCalledTimes(1);
        expect(gapIndexerApi.search).toHaveBeenCalledWith("proj");
      });
    });

    it("debounce timer resets on each keystroke", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: mixedResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      // First keystroke
      fireEvent.change(searchInput, { target: { value: "test" } });
      act(() => jest.advanceTimersByTime(400));
      
      // Second keystroke before debounce completes
      fireEvent.change(searchInput, { target: { value: "testi" } });
      act(() => jest.advanceTimersByTime(400));
      
      // Third keystroke
      fireEvent.change(searchInput, { target: { value: "testin" } });
      
      // Complete debounce from last keystroke
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      await waitFor(() => {
        expect(gapIndexerApi.search).toHaveBeenCalledTimes(1);
        expect(gapIndexerApi.search).toHaveBeenCalledWith("testin");
      });
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
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      // First, type enough characters to trigger search
      fireEvent.change(searchInput, { target: { value: "test" } });
      jest.useFakeTimers();
      act(() => jest.advanceTimersByTime(500));
      jest.useRealTimers();
      
      await waitFor(() => {
        expect(gapIndexerApi.search).toHaveBeenCalled();
      });
      
      // Then reduce to less than 3 characters
      gapIndexerApi.search.mockClear();
      fireEvent.change(searchInput, { target: { value: "te" } });
      
      jest.useFakeTimers();
      act(() => jest.advanceTimersByTime(500));
      jest.useRealTimers();
      
      // Should not trigger new search
      expect(gapIndexerApi.search).not.toHaveBeenCalled();
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
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it("successful search response displays results", async () => {
      const { gapIndexerApi } = require("@/utilities/gapIndexerApi");
      gapIndexerApi.search.mockResolvedValue({ data: projectsOnlyResults });
      
      renderWithProviders(<NavbarSearch />);
      const searchInput = screen.getByPlaceholderText(/search project\/community/i);
      
      fireEvent.change(searchInput, { target: { value: "awesome" } });
      act(() => jest.advanceTimersByTime(500));
      
      await waitFor(() => {
        expect(screen.getByText("Awesome Project")).toBeInTheDocument();
      });
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

