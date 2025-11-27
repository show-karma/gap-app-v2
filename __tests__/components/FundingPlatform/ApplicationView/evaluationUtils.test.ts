import {
  parseEvaluation,
  getScoreColor,
  getScoreIcon,
  getPriorityColor,
  getStatusColor,
} from "@/components/FundingPlatform/ApplicationView/evaluationUtils";
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import React from "react";

describe("evaluationUtils", () => {
  describe("parseEvaluation", () => {
    it("should parse valid JSON string", () => {
      const validJSON = '{"score": 8, "decision": "approve"}';
      const result = parseEvaluation(validJSON);

      expect(result).toEqual({ score: 8, decision: "approve" });
    });

    it("should parse complex nested JSON", () => {
      const complexJSON = '{"summary": {"strengths": ["good"], "concerns": []}, "score": 7}';
      const result = parseEvaluation(complexJSON);

      expect(result).toEqual({
        summary: { strengths: ["good"], concerns: [] },
        score: 7,
      });
    });

    it("should return null for invalid JSON", () => {
      const invalidJSON = '{"score": 8, invalid}';
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = parseEvaluation(invalidJSON);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Failed to parse evaluation JSON:", expect.any(Error));

      consoleSpy.mockRestore();
    });

    it("should return null for empty string", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = parseEvaluation("");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should return null for malformed JSON", () => {
      const malformedJSON = "{score: 8}";
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = parseEvaluation(malformedJSON);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("getScoreColor", () => {
    it("should return green for scores greater than 7", () => {
      expect(getScoreColor(8)).toBe("bg-green-500");
      expect(getScoreColor(9)).toBe("bg-green-500");
      expect(getScoreColor(10)).toBe("bg-green-500");
    });

    it("should return yellow for scores between 4 and 7 (inclusive)", () => {
      expect(getScoreColor(4)).toBe("bg-yellow-500");
      expect(getScoreColor(5)).toBe("bg-yellow-500");
      expect(getScoreColor(6)).toBe("bg-yellow-500");
      expect(getScoreColor(7)).toBe("bg-yellow-500");
    });

    it("should return red for scores less than 4", () => {
      expect(getScoreColor(0)).toBe("bg-red-500");
      expect(getScoreColor(1)).toBe("bg-red-500");
      expect(getScoreColor(2)).toBe("bg-red-500");
      expect(getScoreColor(3)).toBe("bg-red-500");
    });

    it("should handle edge case at boundary 7", () => {
      expect(getScoreColor(7)).toBe("bg-yellow-500");
      expect(getScoreColor(7.1)).toBe("bg-green-500");
    });

    it("should handle edge case at boundary 4", () => {
      expect(getScoreColor(3.9)).toBe("bg-red-500");
      expect(getScoreColor(4)).toBe("bg-yellow-500");
    });
  });

  describe("getScoreIcon", () => {
    it("should return CheckCircleIcon for scores greater than 7", () => {
      const icon8 = getScoreIcon(8);
      const icon9 = getScoreIcon(9);
      const icon10 = getScoreIcon(10);

      expect(React.isValidElement(icon8)).toBe(true);
      expect(icon8.type).toBe(CheckCircleIcon);
      expect(icon8.props.className).toBe("w-5 h-5 text-green-500");

      expect(icon9.type).toBe(CheckCircleIcon);
      expect(icon10.type).toBe(CheckCircleIcon);
    });

    it("should return ExclamationTriangleIcon for scores between 4 and 7 (inclusive)", () => {
      const icon4 = getScoreIcon(4);
      const icon5 = getScoreIcon(5);
      const icon7 = getScoreIcon(7);

      expect(icon4.type).toBe(ExclamationTriangleIcon);
      expect(icon4.props.className).toBe("w-5 h-5 text-blue-500");

      expect(icon5.type).toBe(ExclamationTriangleIcon);
      expect(icon7.type).toBe(ExclamationTriangleIcon);
    });

    it("should return XMarkIcon for scores less than 4", () => {
      const icon0 = getScoreIcon(0);
      const icon1 = getScoreIcon(1);
      const icon3 = getScoreIcon(3);

      expect(icon0.type).toBe(XMarkIcon);
      expect(icon0.props.className).toBe("w-5 h-5 text-red-500");

      expect(icon1.type).toBe(XMarkIcon);
      expect(icon3.type).toBe(XMarkIcon);
    });
  });

  describe("getPriorityColor", () => {
    it("should return red color for high priority", () => {
      const result = getPriorityColor("high");
      expect(result).toBe("bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300");
    });

    it("should return yellow color for medium priority", () => {
      const result = getPriorityColor("medium");
      expect(result).toBe("bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300");
    });

    it("should return blue color for low priority", () => {
      const result = getPriorityColor("low");
      expect(result).toBe("bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300");
    });

    it("should handle case-insensitive priority values", () => {
      expect(getPriorityColor("HIGH")).toBe("bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300");
      expect(getPriorityColor("Medium")).toBe("bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300");
      expect(getPriorityColor("LOW")).toBe("bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300");
    });

    it("should return default color for unknown priority", () => {
      const result = getPriorityColor("unknown");
      expect(result).toBe("bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200");
    });

    it("should return default color for empty string", () => {
      const result = getPriorityColor("");
      expect(result).toBe("bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200");
    });

    it("should return default color for null/undefined (falsy values)", () => {
      // TypeScript won't allow null/undefined, but we test empty string which is falsy
      const result = getPriorityColor("");
      expect(result).toBe("bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200");
    });
  });

  describe("getStatusColor", () => {
    it("should return green color for complete status", () => {
      const result = getStatusColor("complete");
      expect(result).toBe("bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300");
    });

    it("should return yellow color for incomplete status", () => {
      const result = getStatusColor("incomplete");
      expect(result).toBe("bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300");
    });

    it("should return red color for rejected status", () => {
      const result = getStatusColor("rejected");
      expect(result).toBe("bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300");
    });

    it("should handle case-insensitive status values", () => {
      expect(getStatusColor("COMPLETE")).toBe("bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300");
      expect(getStatusColor("Incomplete")).toBe("bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300");
      expect(getStatusColor("REJECTED")).toBe("bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300");
    });

    it("should return default color for unknown status", () => {
      const result = getStatusColor("unknown");
      expect(result).toBe("bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200");
    });

    it("should return default color for empty string", () => {
      const result = getStatusColor("");
      expect(result).toBe("bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200");
    });
  });
});

