import { act, renderHook } from "@testing-library/react";
import type { OnboardingData } from "@/components/Pages/OnboardingAssistant/types";
import {
  extractJsonFromMessage,
  extractUrls,
  useOnboardingChat,
} from "@/components/Pages/OnboardingAssistant/useOnboardingChat";

describe("extractUrls", () => {
  it("should return empty array for text without URLs", () => {
    expect(extractUrls("hello world")).toEqual([]);
  });

  it("should extract a single https URL", () => {
    expect(extractUrls("Check out https://example.com")).toEqual(["https://example.com"]);
  });

  it("should extract a single http URL", () => {
    expect(extractUrls("Visit http://test.org")).toEqual(["http://test.org"]);
  });

  it("should extract multiple URLs", () => {
    const text = "See https://example.com and http://test.org/page for details";
    const urls = extractUrls(text);
    expect(urls).toContain("https://example.com");
    expect(urls).toContain("http://test.org/page");
    expect(urls).toHaveLength(2);
  });

  it("should extract URLs with paths", () => {
    expect(extractUrls("Go to https://example.com/path/to/page")).toEqual([
      "https://example.com/path/to/page",
    ]);
  });

  it("should extract URLs with query parameters", () => {
    const result = extractUrls("Link: https://example.com/page?foo=bar&baz=1");
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("https://example.com/page?foo=bar");
  });

  it("should deduplicate identical URLs", () => {
    const text = "https://example.com and again https://example.com here";
    expect(extractUrls(text)).toEqual(["https://example.com"]);
  });

  it("should handle URLs with percent-encoded characters", () => {
    const result = extractUrls("See https://example.com/path%20name");
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("example.com");
  });

  it("should return empty array for empty string", () => {
    expect(extractUrls("")).toEqual([]);
  });
});

describe("extractJsonFromMessage", () => {
  it("should return null for messages without JSON blocks", () => {
    expect(extractJsonFromMessage("Hello, no JSON here")).toBeNull();
  });

  it("should return null for empty code blocks", () => {
    expect(extractJsonFromMessage("```json\n```")).toBeNull();
  });

  it("should extract valid onboarding data", () => {
    const data: OnboardingData = {
      type: "onboarding_data",
      project: {
        title: "Test Project",
        description: "A test project",
        problem: "Testing problem",
        solution: "Testing solution",
        missionSummary: "Test mission",
      },
      grants: [],
    };

    const content = `Here is your project data:\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\nPlease review.`;
    const result = extractJsonFromMessage(content);

    expect(result).not.toBeNull();
    expect(result?.type).toBe("onboarding_data");
    expect(result?.project.title).toBe("Test Project");
    expect(result?.project.description).toBe("A test project");
    expect(result?.project.problem).toBe("Testing problem");
    expect(result?.project.solution).toBe("Testing solution");
    expect(result?.project.missionSummary).toBe("Test mission");
  });

  it("should extract data with grants and milestones", () => {
    const data: OnboardingData = {
      type: "onboarding_data",
      project: {
        title: "Project",
        description: "Desc",
        problem: "Problem",
        solution: "Solution",
        missionSummary: "Mission",
        links: { github: "test-org", twitter: "testproject" },
      },
      grants: [
        {
          title: "Grant 1",
          amount: "$50,000",
          community: "Gitcoin",
          milestones: [
            { title: "Milestone 1", description: "Build MVP" },
            { title: "Milestone 2", description: "Launch" },
          ],
        },
      ],
    };

    const content = `\`\`\`json\n${JSON.stringify(data)}\n\`\`\``;
    const result = extractJsonFromMessage(content);

    expect(result).not.toBeNull();
    expect(result?.grants).toHaveLength(1);
    expect(result?.grants[0].title).toBe("Grant 1");
    expect(result?.grants[0].milestones).toHaveLength(2);
    expect(result?.project.links?.github).toBe("test-org");
  });

  it("should return null for invalid JSON", () => {
    const content = "```json\n{invalid json}\n```";
    expect(extractJsonFromMessage(content)).toBeNull();
  });

  it("should return null for JSON without type field", () => {
    const content = '```json\n{"project":{"title":"Test"}}\n```';
    expect(extractJsonFromMessage(content)).toBeNull();
  });

  it("should return null for JSON without project title", () => {
    const content =
      '```json\n{"type":"onboarding_data","project":{"description":"test"},"grants":[]}\n```';
    expect(extractJsonFromMessage(content)).toBeNull();
  });

  it("should return null for JSON without project description", () => {
    const content =
      '```json\n{"type":"onboarding_data","project":{"title":"test"},"grants":[]}\n```';
    expect(extractJsonFromMessage(content)).toBeNull();
  });

  it("should return null for wrong type value", () => {
    const content =
      '```json\n{"type":"wrong_type","project":{"title":"test","description":"test"},"grants":[]}\n```';
    expect(extractJsonFromMessage(content)).toBeNull();
  });

  it("should handle JSON with extra whitespace in code block", () => {
    const data: OnboardingData = {
      type: "onboarding_data",
      project: {
        title: "Test",
        description: "Desc",
        problem: "P",
        solution: "S",
        missionSummary: "M",
      },
      grants: [],
    };

    const content = `\`\`\`json\n\n  ${JSON.stringify(data)}  \n\n\`\`\``;
    const result = extractJsonFromMessage(content);
    expect(result).not.toBeNull();
    expect(result?.project.title).toBe("Test");
  });
});

describe("useOnboardingChat hook", () => {
  it("should initialize with empty state", () => {
    const { result } = renderHook(() => useOnboardingChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe("");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.extractedData).toBeNull();
    expect(result.current.hasExtractedData).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should update input via handleInputChange", () => {
    const { result } = renderHook(() => useOnboardingChat());

    act(() => {
      result.current.handleInputChange({
        target: { value: "hello world" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.input).toBe("hello world");
  });

  it("should update input via setInput", () => {
    const { result } = renderHook(() => useOnboardingChat());

    act(() => {
      result.current.setInput("direct set");
    });

    expect(result.current.input).toBe("direct set");
  });

  it("should not submit empty input", async () => {
    const { result } = renderHook(() => useOnboardingChat());

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent);
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("should not submit whitespace-only input", async () => {
    const { result } = renderHook(() => useOnboardingChat());

    act(() => {
      result.current.setInput("   ");
    });

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent);
    });

    expect(result.current.messages).toEqual([]);
  });

  it("should reset all state via resetConversation", () => {
    const { result } = renderHook(() => useOnboardingChat());

    // Set some state
    act(() => {
      result.current.setInput("some text");
    });

    expect(result.current.input).toBe("some text");

    // Reset
    act(() => {
      result.current.resetConversation();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe("");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.extractedData).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
