import { describe, expect, it } from "vitest";
import { extractModelsFromResponse } from "../useAvailableAIModels";

describe("extractModelsFromResponse", () => {
  it("returns only models assigned to the requested selection surface", () => {
    const response = {
      data: {
        models: ["model-a", "model-b"],
        selections: {
          programPrompt: ["model-a"],
          portfolioReport: ["model-b"],
        },
      },
    };

    expect(extractModelsFromResponse(response, "programPrompt")).toEqual(["model-a"]);
    expect(extractModelsFromResponse(response, "portfolioReport")).toEqual(["model-b"]);
  });

  it("uses the all-model list while an older backend response is deployed", () => {
    expect(extractModelsFromResponse({ models: ["model-a"] }, "programPrompt")).toEqual([
      "model-a",
    ]);
  });
});
