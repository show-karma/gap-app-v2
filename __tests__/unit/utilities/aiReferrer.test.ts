/**
 * @file Tests for AI-referrer classification and first-touch attribution
 */

import {
  __resetAiFirstTouchCacheForTests,
  AI_FIRST_TOUCH_STORAGE_KEY,
  type AiFirstTouch,
  type AiReferrerClassification,
  type AiReferrerInput,
  type AiReferrerMedium,
  type AiSource,
  type CaptureAiFirstTouchResult,
  captureAiFirstTouch,
  classifyAiReferrer,
  getAiFirstTouchProps,
  readAiFirstTouch,
} from "@/utilities/aiReferrer";

const SITE = "https://gap.karmahq.xyz";
const LANDING = `${SITE}/project/my-project`;

const readStoredRaw = (): string | null => window.localStorage.getItem(AI_FIRST_TOUCH_STORAGE_KEY);

/** Typed expectation so a table row can't name a source or medium that doesn't exist. */
const expectClassification = (
  input: AiReferrerInput,
  source: AiSource,
  medium: AiReferrerMedium
) => {
  const expected: AiReferrerClassification = { source, medium };
  expect(classifyAiReferrer(input)).toEqual(expected);
};

describe("classifyAiReferrer", () => {
  describe("referrer host", () => {
    it.each<[string, AiSource]>([
      ["https://chat.openai.com/", "chatgpt"],
      ["https://chatgpt.com/c/abc123", "chatgpt"],
      ["https://claude.ai/chat/abc", "claude"],
      ["https://www.anthropic.com/", "claude"],
      ["https://www.perplexity.ai/search?q=karma", "perplexity"],
      ["https://pplx.ai/x", "perplexity"],
      ["https://gemini.google.com/app", "gemini"],
      ["https://bard.google.com/", "gemini"],
      ["https://copilot.microsoft.com/chats/1", "copilot"],
      ["https://edgeservices.bing.com/edgesvc", "copilot"],
      ["https://poe.com/chat/1", "ai-generic"],
      ["https://www.phind.com/search", "ai-generic"],
      ["https://chat.deepseek.com/", "ai-generic"],
    ])("classifies %s as %s via referral", (referrer, expected) => {
      expectClassification({ referrer, url: LANDING }, expected, "referral");
    });
  });

  describe("bing.com — only the answer-engine surfaces, never organic search", () => {
    it.each([
      "https://www.bing.com/chat?q=karma",
      "https://www.bing.com/chat/",
      "https://bing.com/copilotsearch?q=karma",
      "https://www.bing.com/search?q=karma&showconv=1",
    ])("classifies %s as copilot", (referrer) => {
      expectClassification({ referrer, url: LANDING }, "copilot", "referral");
    });

    it.each(["https://www.bing.com/search?q=karma", "https://www.bing.com/", "https://bing.com"])(
      "leaves %s unclassified",
      (referrer) => {
        expect(classifyAiReferrer({ referrer, url: LANDING })).toBeNull();
      }
    );
  });

  describe("utm parameters (assistants that strip the referrer)", () => {
    it.each<[string, AiSource]>([
      ["utm_source=chatgpt.com", "chatgpt"],
      ["utm_source=openai", "chatgpt"],
      ["utm_source=perplexity", "perplexity"],
      ["utm_source=Claude", "claude"],
      ["utm_source=gemini", "gemini"],
      ["utm_source=bing-chat", "copilot"],
    ])("classifies %s as %s via utm with no referrer at all", (query, expected) => {
      expectClassification({ referrer: "", url: `${LANDING}?${query}` }, expected, "utm");
    });

    it("falls back to ai-generic when only utm_medium marks the visit as AI", () => {
      expectClassification(
        { referrer: "", url: `${LANDING}?utm_source=some-new-assistant&utm_medium=ai` },
        "ai-generic",
        "utm"
      );
    });

    it("prefers the utm tag over a conflicting referrer host", () => {
      expectClassification(
        {
          referrer: "https://www.perplexity.ai/search",
          url: `${LANDING}?utm_source=chatgpt.com`,
        },
        "chatgpt",
        "utm"
      );
    });
  });

  describe("non-AI traffic", () => {
    it("returns null when there is no referrer and no utm tag", () => {
      expect(classifyAiReferrer({ referrer: "", url: LANDING })).toBeNull();
    });

    it("does not classify bare google.com as gemini", () => {
      expect(classifyAiReferrer({ referrer: "https://www.google.com/", url: LANDING })).toBeNull();
    });

    it("returns null for a same-origin (internal navigation) referrer", () => {
      expect(classifyAiReferrer({ referrer: `${SITE}/projects`, url: LANDING })).toBeNull();
    });

    it("returns null for a non-AI external referrer", () => {
      expect(
        classifyAiReferrer({ referrer: "https://twitter.com/karmahq", url: LANDING })
      ).toBeNull();
    });

    it.each([
      "https://notchatgpt.com/",
      "https://chatgpt.com.evil.io/c/abc",
      "https://www.perplexity.ai.phishing.example/search",
      "https://fake-claude.ai/chat",
    ])("does not classify the lookalike host %s", (referrer) => {
      expect(classifyAiReferrer({ referrer, url: LANDING })).toBeNull();
    });

    it("matches an AI host case-insensitively", () => {
      expectClassification(
        { referrer: "https://CHATGPT.COM/c/abc", url: LANDING },
        "chatgpt",
        "referral"
      );
    });

    it("ignores a non-AI utm campaign", () => {
      expect(
        classifyAiReferrer({
          referrer: "",
          url: `${LANDING}?utm_source=newsletter&utm_medium=email`,
        })
      ).toBeNull();
    });
  });

  describe("malformed input", () => {
    it("returns null for a malformed referrer instead of throwing", () => {
      expect(() => classifyAiReferrer({ referrer: "not-a-url", url: LANDING })).not.toThrow();
      expect(classifyAiReferrer({ referrer: "not-a-url", url: LANDING })).toBeNull();
    });

    it.each(["", "://", "javascript:void(0)", "android-app://com.example"])(
      "returns null for referrer %j",
      (referrer) => {
        expect(classifyAiReferrer({ referrer, url: LANDING })).toBeNull();
      }
    );

    it("classifies a protocol-relative referrer, which is a valid URL reference", () => {
      expectClassification(
        { referrer: "//chatgpt.com/c/abc", url: LANDING },
        "chatgpt",
        "referral"
      );
    });

    it("still classifies via utm when the referrer is malformed", () => {
      expectClassification(
        { referrer: "not-a-url", url: `${LANDING}?utm_source=perplexity` },
        "perplexity",
        "utm"
      );
    });

    it("returns null when the current url itself is malformed and the referrer is not AI", () => {
      expect(classifyAiReferrer({ referrer: "", url: "not-a-url" })).toBeNull();
    });

    it("still classifies by referrer when the current url is malformed", () => {
      expect(classifyAiReferrer({ referrer: "https://claude.ai/chat", url: "" })).toEqual({
        source: "claude",
        medium: "referral",
      });
    });
  });
});

describe("captureAiFirstTouch", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetAiFirstTouchCacheForTests();
  });

  it("persists source, medium, landing path and timestamp on an AI landing", () => {
    const result = captureAiFirstTouch({
      referrer: "https://www.perplexity.ai/search",
      url: `${LANDING}?ref=abc`,
    });

    expect(result.isNew).toBe(true);
    expect(result.firstTouch).toEqual({
      source: "perplexity",
      medium: "referral",
      landingPath: "/project/my-project",
      firstSeenAt: expect.any(String),
    });
    expect(readAiFirstTouch()).toEqual(result.firstTouch);
  });

  it("stores the pathname only — never the query string or any identifier", () => {
    captureAiFirstTouch({
      referrer: "",
      url: `${LANDING}?utm_source=chatgpt.com&email=someone%40example.com&userId=0xabc`,
    });

    const raw = readStoredRaw() ?? "";
    expect(raw).not.toContain("?");
    expect(raw).not.toContain("example.com");
    expect(raw).not.toContain("0xabc");
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual([
      "firstSeenAt",
      "landingPath",
      "medium",
      "source",
    ]);
  });

  it("does not write anything when the visit is not AI-originated", () => {
    const result = captureAiFirstTouch({ referrer: "https://www.google.com/", url: LANDING });

    expect(result).toEqual({ firstTouch: null, isNew: false });
    expect(readStoredRaw()).toBeNull();
  });

  it("survives simulated internal navigation without being overwritten or cleared", () => {
    const landing = captureAiFirstTouch({
      referrer: "https://chatgpt.com/c/abc",
      url: `${SITE}/project/my-project`,
    });
    expect(landing.isNew).toBe(true);

    // Three same-origin hops, each re-running capture the way a hard
    // navigation would.
    const hops: AiReferrerInput[] = [
      { referrer: `${SITE}/project/my-project`, url: `${SITE}/project/my-project/grants` },
      { referrer: `${SITE}/project/my-project/grants`, url: `${SITE}/project/my-project/impact` },
      { referrer: `${SITE}/project/my-project/impact`, url: `${SITE}/funding-map` },
    ];
    for (const hopInput of hops) {
      const hop: CaptureAiFirstTouchResult = captureAiFirstTouch(hopInput);
      expect(hop.isNew).toBe(false);
      expect(hop.firstTouch).toEqual(landing.firstTouch);
    }

    expect(readAiFirstTouch()).toEqual(landing.firstTouch);
    expect(getAiFirstTouchProps()).toEqual({
      ai_source: "chatgpt",
      ai_source_medium: "referral",
      ai_first_touch_at: landing.firstTouch?.firstSeenAt,
    });
  });

  it("keeps the original source when a later visit comes from a different answer engine", () => {
    const first = captureAiFirstTouch({ referrer: "https://claude.ai/chat/1", url: LANDING });
    const second = captureAiFirstTouch({
      referrer: "https://www.perplexity.ai/search",
      url: `${SITE}/funding-map`,
    });

    expect(second.isNew).toBe(false);
    expect(second.firstTouch).toEqual(first.firstTouch);
    expect(second.firstTouch?.source).toBe("claude");
  });

  it("treats a corrupted stored value as absent and re-captures without throwing", () => {
    window.localStorage.setItem(AI_FIRST_TOUCH_STORAGE_KEY, "{not-json");

    expect(readAiFirstTouch()).toBeNull();
    const result = captureAiFirstTouch({ referrer: "https://chatgpt.com/c/abc", url: LANDING });

    expect(result.isNew).toBe(true);
    expect(result.firstTouch?.source).toBe("chatgpt");
  });

  it("treats a structurally invalid stored value as absent", () => {
    window.localStorage.setItem(
      AI_FIRST_TOUCH_STORAGE_KEY,
      JSON.stringify({ source: "not-a-source", medium: "referral" })
    );

    expect(readAiFirstTouch()).toBeNull();
    expect(getAiFirstTouchProps()).toEqual({});
  });

  it("falls back to document.referrer and window.location when no input is given", () => {
    const referrerSpy = vi
      .spyOn(document, "referrer", "get")
      .mockReturnValue("https://poe.com/chat");

    const result = captureAiFirstTouch();

    expect(result.firstTouch?.source).toBe("ai-generic");
    expect(result.firstTouch?.landingPath).toBe(window.location.pathname);
    referrerSpy.mockRestore();
  });

  it("degrades to a session-only classification when localStorage writes are blocked", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    const result = captureAiFirstTouch({ referrer: "https://claude.ai/chat/1", url: LANDING });

    expect(result.firstTouch?.source).toBe("claude");
    expect(result.isNew).toBe(true);
    // Nothing reached storage, but later events in the same page load must
    // still be attributed — otherwise a Safari-private-mode visitor loses the
    // AI origin on every event after the landing.
    expect(readStoredRaw()).toBeNull();
    expect(getAiFirstTouchProps()).toEqual({
      ai_source: "claude",
      ai_source_medium: "referral",
      ai_first_touch_at: result.firstTouch?.firstSeenAt,
    });
    setItemSpy.mockRestore();
  });
});

describe("first-touch capture ordering", () => {
  let referrerSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    window.localStorage.clear();
    __resetAiFirstTouchCacheForTests();
  });

  afterEach(() => {
    referrerSpy?.mockRestore();
    referrerSpy = undefined;
  });

  it("captures on the first property read, so an event that beats the tracker is attributed", () => {
    referrerSpy = vi
      .spyOn(document, "referrer", "get")
      .mockReturnValue("https://www.perplexity.ai/search?q=karma");

    // Simulates a page's own view event firing before the deferred
    // AiReferrerTracker chunk has loaded.
    expect(getAiFirstTouchProps()).toMatchObject({
      ai_source: "perplexity",
      ai_source_medium: "referral",
    });
    expect(readAiFirstTouch()?.source).toBe("perplexity");
  });

  it("still reports the landing exactly once when a property read captured first", () => {
    referrerSpy = vi
      .spyOn(document, "referrer", "get")
      .mockReturnValue("https://www.perplexity.ai/search?q=karma");

    getAiFirstTouchProps();

    const first = captureAiFirstTouch();
    const second = captureAiFirstTouch();

    expect(first.isNew).toBe(true);
    expect(second.isNew).toBe(false);
    expect(first.firstTouch?.source).toBe("perplexity");
  });

  it("does not report a landing for a visitor whose record predates this page load", () => {
    window.localStorage.setItem(
      AI_FIRST_TOUCH_STORAGE_KEY,
      JSON.stringify({
        source: "gemini",
        medium: "utm",
        landingPath: "/programs",
        firstSeenAt: "2026-07-31T10:00:00.000Z",
      } satisfies AiFirstTouch)
    );

    getAiFirstTouchProps();

    expect(captureAiFirstTouch().isNew).toBe(false);
  });
});

describe("getAiFirstTouchProps", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetAiFirstTouchCacheForTests();
  });

  it("returns an empty object when there is no stored first touch", () => {
    expect(getAiFirstTouchProps()).toEqual({});
  });

  it("returns the normalized analytics properties when a first touch is stored", () => {
    const stored: AiFirstTouch = {
      source: "gemini",
      medium: "utm",
      landingPath: "/programs",
      firstSeenAt: "2026-07-31T10:00:00.000Z",
    };
    window.localStorage.setItem(AI_FIRST_TOUCH_STORAGE_KEY, JSON.stringify(stored));

    expect(getAiFirstTouchProps()).toEqual({
      ai_source: "gemini",
      ai_source_medium: "utm",
      ai_first_touch_at: "2026-07-31T10:00:00.000Z",
    });
  });
});
