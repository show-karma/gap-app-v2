import { validateGithubInput } from "@/utilities/github";

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe("validateGithubInput", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("empty/blank input", () => {
    it("returns valid for empty string", async () => {
      const result = await validateGithubInput("", mockFetch);
      expect(result).toEqual({ valid: true });
    });

    it("returns valid for whitespace-only string", async () => {
      const result = await validateGithubInput("   ", mockFetch);
      expect(result).toEqual({ valid: true });
    });

    it("does not call fetch for empty input", async () => {
      await validateGithubInput("", mockFetch);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("input without github.com", () => {
    it("rejects plain username without github.com", async () => {
      const result = await validateGithubInput("CELO-Hackathon", mockFetch);
      expect(result).toEqual({
        valid: false,
        error: "Please use the format https://github.com/your-organization",
      });
    });

    it("rejects random URLs", async () => {
      const result = await validateGithubInput("https://gitlab.com/some-org", mockFetch);
      expect(result).toEqual({
        valid: false,
        error: "Please use the format https://github.com/your-organization",
      });
    });

    it("does not call fetch", async () => {
      await validateGithubInput("CELO-Hackathon", mockFetch);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("github.com with no path", () => {
    it("rejects bare github.com", async () => {
      const result = await validateGithubInput("https://github.com", mockFetch);
      expect(result).toEqual({
        valid: false,
        error: "Please use the format https://github.com/your-organization",
      });
    });

    it("rejects github.com with trailing slash", async () => {
      const result = await validateGithubInput("https://github.com/", mockFetch);
      expect(result).toEqual({
        valid: false,
        error: "Please use the format https://github.com/your-organization",
      });
    });
  });

  describe("org page URLs (github.com/orgs/X/...)", () => {
    it("rejects org repositories page and suggests correct URL", async () => {
      const result = await validateGithubInput(
        "https://github.com/orgs/CELO-Hackathon/repositories",
        mockFetch
      );
      expect(result).toEqual({
        valid: false,
        error: "Please use https://github.com/CELO-Hackathon instead.",
      });
    });

    it("rejects org people page", async () => {
      const result = await validateGithubInput(
        "https://github.com/orgs/facebook/people",
        mockFetch
      );
      expect(result).toEqual({
        valid: false,
        error: "Please use https://github.com/facebook instead.",
      });
    });

    it("rejects org URL with just two segments", async () => {
      const result = await validateGithubInput("https://github.com/orgs/my-org", mockFetch);
      expect(result).toEqual({
        valid: false,
        error: "Please use https://github.com/my-org instead.",
      });
    });

    it("does not call fetch for org URLs", async () => {
      await validateGithubInput("https://github.com/orgs/CELO-Hackathon/repositories", mockFetch);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("repo URLs (github.com/owner/repo)", () => {
    it("rejects repo URL and suggests owner URL", async () => {
      const result = await validateGithubInput(
        "https://github.com/CELO-Hackathon/pulse-remit",
        mockFetch
      );
      expect(result).toEqual({
        valid: false,
        error: "Please use https://github.com/CELO-Hackathon instead.",
      });
    });

    it("rejects deep repo URLs", async () => {
      const result = await validateGithubInput(
        "https://github.com/facebook/react/tree/main/packages",
        mockFetch
      );
      expect(result).toEqual({
        valid: false,
        error: "Please use https://github.com/facebook instead.",
      });
    });

    it("does not call fetch for repo URLs", async () => {
      await validateGithubInput("https://github.com/CELO-Hackathon/pulse-remit", mockFetch);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("valid user/org URLs (github.com/name)", () => {
    it("validates existing GitHub user", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      const result = await validateGithubInput("https://github.com/CELO-Hackathon", mockFetch);
      expect(result).toEqual({ valid: true });
      expect(mockFetch).toHaveBeenCalledWith("https://api.github.com/users/CELO-Hackathon");
    });

    it("validates with https protocol", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      const result = await validateGithubInput("https://github.com/facebook", mockFetch);
      expect(result).toEqual({ valid: true });
      expect(mockFetch).toHaveBeenCalledWith("https://api.github.com/users/facebook");
    });

    it("validates without protocol (adds https)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      const result = await validateGithubInput("github.com/my-org", mockFetch);
      expect(result).toEqual({ valid: true });
      expect(mockFetch).toHaveBeenCalledWith("https://api.github.com/users/my-org");
    });

    it("returns error when user/org not found (404)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response);

      const result = await validateGithubInput(
        "https://github.com/nonexistent-org-12345",
        mockFetch
      );
      expect(result).toEqual({
        valid: false,
        error: 'GitHub user or organization "nonexistent-org-12345" not found.',
      });
    });

    it("returns error on API failure (500)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

      const result = await validateGithubInput("https://github.com/some-org", mockFetch);
      expect(result).toEqual({
        valid: false,
        error: 'GitHub user or organization "some-org" not found.',
      });
    });
  });

  describe("URL with trailing slash", () => {
    it("validates github.com/name/ (trailing slash)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      const result = await validateGithubInput("https://github.com/CELO-Hackathon/", mockFetch);
      expect(result).toEqual({ valid: true });
      expect(mockFetch).toHaveBeenCalledWith("https://api.github.com/users/CELO-Hackathon");
    });
  });

  describe("edge cases", () => {
    it("handles http protocol (not https)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      const result = await validateGithubInput("http://github.com/my-org", mockFetch);
      expect(result).toEqual({ valid: true });
    });

    it("handles www.github.com", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      const result = await validateGithubInput("https://www.github.com/my-org", mockFetch);
      expect(result).toEqual({ valid: true });
    });

    it("propagates fetch network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(validateGithubInput("https://github.com/some-org", mockFetch)).rejects.toThrow(
        "Network error"
      );
    });
  });
});
