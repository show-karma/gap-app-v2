/**
 * @file Tests for usePagination hook
 * @description Tests pagination logic hook with page range calculation
 */

import { renderHook } from "@testing-library/react";
import { DOTS, usePagination } from "@/hooks/usePagination";

describe("usePagination", () => {
  describe("Basic Pagination", () => {
    it("should return all pages when total pages is less than or equal to page numbers", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 1,
          totalPosts: 50,
          postsPerPage: 10,
          siblingCount: 1,
        })
      );

      expect(result.current).toEqual([1, 2, 3, 4, 5]);
    });

    it("should handle single page", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 1,
          totalPosts: 5,
          postsPerPage: 10,
        })
      );

      expect(result.current).toEqual([1]);
    });

    it("should handle exact page count", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 1,
          totalPosts: 30,
          postsPerPage: 10,
        })
      );

      expect(result.current).toEqual([1, 2, 3]);
    });

    it("should calculate total page count correctly", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 1,
          totalPosts: 95,
          postsPerPage: 10,
        })
      );

      // 95 posts / 10 per page = 10 pages (ceiling)
      expect(result.current).toContain(10);
    });
  });

  describe("Right Dots (Beginning Pages)", () => {
    it("should show right dots when at the beginning", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 1,
          totalPosts: 100,
          postsPerPage: 10,
          siblingCount: 1,
        })
      );

      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);
    });

    it("should show right dots on page 2", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 2,
          totalPosts: 100,
          postsPerPage: 10,
          siblingCount: 1,
        })
      );

      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);
    });

    it("should show right dots on page 3", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 3,
          totalPosts: 100,
          postsPerPage: 10,
          siblingCount: 1,
        })
      );

      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);
    });
  });

  describe("Left Dots (Ending Pages)", () => {
    it("should show left dots when at the end", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 10,
          totalPosts: 100,
          postsPerPage: 10,
          siblingCount: 1,
        })
      );

      expect(result.current).toEqual([1, DOTS, 6, 7, 8, 9, 10]);
    });

    it("should show left dots on page 9", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 9,
          totalPosts: 100,
          postsPerPage: 10,
          siblingCount: 1,
        })
      );

      expect(result.current).toEqual([1, DOTS, 6, 7, 8, 9, 10]);
    });

    it("should show left dots on page 8", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 8,
          totalPosts: 100,
          postsPerPage: 10,
          siblingCount: 1,
        })
      );

      expect(result.current).toEqual([1, DOTS, 6, 7, 8, 9, 10]);
    });
  });

  describe("Both Dots (Middle Pages)", () => {
    it("should show both dots when in the middle", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 5,
          totalPosts: 100,
          postsPerPage: 10,
          siblingCount: 1,
        })
      );

      expect(result.current).toEqual([1, DOTS, 4, 5, 6, DOTS, 10]);
    });

    it("should show both dots on page 6", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 6,
          totalPosts: 100,
          postsPerPage: 10,
          siblingCount: 1,
        })
      );

      expect(result.current).toEqual([1, DOTS, 5, 6, 7, DOTS, 10]);
    });

    it("should show left dots on page 7", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 7,
          totalPosts: 100,
          postsPerPage: 10,
          siblingCount: 1,
        })
      );

      expect(result.current).toEqual([1, DOTS, 6, 7, 8, 9, 10]);
    });
  });

  describe("Sibling Count Variations", () => {
    it("should handle siblingCount of 0", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 5,
          totalPosts: 100,
          postsPerPage: 10,
          siblingCount: 0,
        })
      );

      expect(result.current).toEqual([1, DOTS, 5, DOTS, 10]);
    });

    it("should handle siblingCount of 2", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 10,
          totalPosts: 200,
          postsPerPage: 10,
          siblingCount: 2,
        })
      );

      expect(result.current).toEqual([1, DOTS, 8, 9, 10, 11, 12, DOTS, 20]);
    });

    it("should handle siblingCount of 3", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 15,
          totalPosts: 300,
          postsPerPage: 10,
          siblingCount: 3,
        })
      );

      expect(result.current).toEqual([1, DOTS, 12, 13, 14, 15, 16, 17, 18, DOTS, 30]);
    });

    it("should use default siblingCount of 1 when not provided", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 5,
          totalPosts: 100,
          postsPerPage: 10,
        })
      );

      expect(result.current).toEqual([1, DOTS, 4, 5, 6, DOTS, 10]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero posts", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 1,
          totalPosts: 0,
          postsPerPage: 10,
        })
      );

      expect(result.current).toEqual([]);
    });

    it("should handle very large total posts", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 1,
          totalPosts: 10000,
          postsPerPage: 10,
        })
      );

      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 1000]);
    });

    it("should handle posts per page of 1", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 2,
          totalPosts: 10,
          postsPerPage: 1,
        })
      );

      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);
    });

    it("should handle posts per page larger than total posts", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 1,
          totalPosts: 5,
          postsPerPage: 100,
        })
      );

      expect(result.current).toEqual([1]);
    });

    it("should handle current page at last page", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 10,
          totalPosts: 100,
          postsPerPage: 10,
        })
      );

      expect(result.current).toEqual([1, DOTS, 6, 7, 8, 9, 10]);
    });

    it("should handle current page at first page", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 1,
          totalPosts: 100,
          postsPerPage: 10,
        })
      );

      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);
    });
  });

  describe("Current Page Navigation", () => {
    it("should update pagination when current page changes", () => {
      const { result, rerender } = renderHook(
        ({ currentPage }) =>
          usePagination({
            currentPage,
            totalPosts: 100,
            postsPerPage: 10,
          }),
        { initialProps: { currentPage: 1 } }
      );

      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);

      rerender({ currentPage: 5 });
      expect(result.current).toEqual([1, DOTS, 4, 5, 6, DOTS, 10]);

      rerender({ currentPage: 10 });
      expect(result.current).toEqual([1, DOTS, 6, 7, 8, 9, 10]);
    });

    it("should handle sequential page navigation", () => {
      const { result, rerender } = renderHook(
        ({ currentPage }) =>
          usePagination({
            currentPage,
            totalPosts: 100,
            postsPerPage: 10,
          }),
        { initialProps: { currentPage: 1 } }
      );

      // Page 1
      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);

      // Page 2
      rerender({ currentPage: 2 });
      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);

      // Page 3
      rerender({ currentPage: 3 });
      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);

      // Page 4
      rerender({ currentPage: 4 });
      expect(result.current).toEqual([1, DOTS, 3, 4, 5, DOTS, 10]);
    });
  });

  describe("Dynamic Posts Count", () => {
    it("should update when total posts changes", () => {
      const { result, rerender } = renderHook(
        ({ totalPosts }) =>
          usePagination({
            currentPage: 1,
            totalPosts,
            postsPerPage: 10,
          }),
        { initialProps: { totalPosts: 50 } }
      );

      expect(result.current).toEqual([1, 2, 3, 4, 5]);

      rerender({ totalPosts: 100 });
      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);
    });

    it("should update when posts per page changes", () => {
      const { result, rerender } = renderHook(
        ({ postsPerPage }) =>
          usePagination({
            currentPage: 1,
            totalPosts: 100,
            postsPerPage,
          }),
        { initialProps: { postsPerPage: 10 } }
      );

      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);

      rerender({ postsPerPage: 20 });
      expect(result.current).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("Return Value Structure", () => {
    it("should return array of numbers and DOTS", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 5,
          totalPosts: 100,
          postsPerPage: 10,
        })
      );

      expect(Array.isArray(result.current)).toBe(true);
      result.current?.forEach((item) => {
        expect(typeof item === "number" || item === DOTS).toBe(true);
      });
    });

    it("should always include first page when showing left dots", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 10,
          totalPosts: 100,
          postsPerPage: 10,
        })
      );

      expect(result.current?.[0]).toBe(1);
    });

    it("should always include last page when showing right dots", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 1,
          totalPosts: 100,
          postsPerPage: 10,
        })
      );

      const lastItem = result.current?.[result.current.length - 1];
      expect(lastItem).toBe(10);
    });

    it("should include current page in the range", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 5,
          totalPosts: 100,
          postsPerPage: 10,
        })
      );

      expect(result.current).toContain(5);
    });
  });

  describe("Memoization", () => {
    it("should return same reference when inputs do not change", () => {
      const { result, rerender } = renderHook(() =>
        usePagination({
          currentPage: 5,
          totalPosts: 100,
          postsPerPage: 10,
        })
      );

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });

    it("should return new reference when inputs change", () => {
      const { result, rerender } = renderHook(
        ({ currentPage }) =>
          usePagination({
            currentPage,
            totalPosts: 100,
            postsPerPage: 10,
          }),
        { initialProps: { currentPage: 5 } }
      );

      const firstResult = result.current;
      rerender({ currentPage: 6 });
      const secondResult = result.current;

      expect(firstResult).not.toBe(secondResult);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle 50 posts with 5 per page", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 5,
          totalPosts: 50,
          postsPerPage: 5,
        })
      );

      expect(result.current).toEqual([1, DOTS, 4, 5, 6, DOTS, 10]);
    });

    it("should handle 1000 posts with 25 per page", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 20,
          totalPosts: 1000,
          postsPerPage: 25,
        })
      );

      expect(result.current).toEqual([1, DOTS, 19, 20, 21, DOTS, 40]);
    });

    it("should handle uneven division of posts", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 1,
          totalPosts: 95,
          postsPerPage: 10,
        })
      );

      // 95 / 10 = 9.5, should ceil to 10 pages
      expect(result.current).toEqual([1, 2, 3, 4, 5, DOTS, 10]);
    });
  });

  describe("DOTS Constant", () => {
    it("should export DOTS constant", () => {
      expect(DOTS).toBe("...");
    });

    it("should use DOTS constant in pagination range", () => {
      const { result } = renderHook(() =>
        usePagination({
          currentPage: 5,
          totalPosts: 100,
          postsPerPage: 10,
        })
      );

      expect(result.current).toContain(DOTS);
    });
  });
});
