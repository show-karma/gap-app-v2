/**
 * @file Tests for AiReferrerTracker — the one-shot mount tracker that captures
 * first-touch answer-engine attribution and emits the landing event.
 */

import { sendGAEvent } from "@next/third-parties/google";
import { render } from "@testing-library/react";
import { AiReferrerTracker } from "@/components/Utilities/AiReferrerTracker";
import {
  __resetAiFirstTouchCacheForTests,
  AI_FIRST_TOUCH_STORAGE_KEY,
  type AiFirstTouch,
} from "@/utilities/aiReferrer";
import { track } from "@/utilities/analytics/client";

vi.mock("@next/third-parties/google", () => ({
  sendGAEvent: vi.fn(),
}));

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const mockTrack = vi.mocked(track);
const mockSendGAEvent = vi.mocked(sendGAEvent);

describe("AiReferrerTracker", () => {
  const originalEnv = process.env;
  let referrerSpy: ReturnType<typeof vi.spyOn> | undefined;

  const setReferrer = (referrer: string) => {
    referrerSpy = vi.spyOn(document, "referrer", "get").mockReturnValue(referrer);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    window.localStorage.clear();
    __resetAiFirstTouchCacheForTests();
  });

  afterEach(() => {
    referrerSpy?.mockRestore();
    referrerSpy = undefined;
    process.env = originalEnv;
  });

  it("renders nothing", () => {
    setReferrer("https://chatgpt.com/c/abc");

    const { container } = render(<AiReferrerTracker />);

    expect(container).toBeEmptyDOMElement();
  });

  it("captures the first touch and fires the landing event once on an AI referral", () => {
    setReferrer("https://www.perplexity.ai/search?q=karma");

    const { rerender } = render(<AiReferrerTracker />);
    rerender(<AiReferrerTracker />);

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("ai_referral_landing", {
      ai_source: "perplexity",
      ai_source_medium: "referral",
      ai_landing_path: window.location.pathname,
    });

    const stored = JSON.parse(
      window.localStorage.getItem(AI_FIRST_TOUCH_STORAGE_KEY) ?? "null"
    ) as AiFirstTouch;
    expect(stored.source).toBe("perplexity");
  });

  it("fires no landing event for non-AI traffic and stores nothing", () => {
    setReferrer("https://www.google.com/");

    render(<AiReferrerTracker />);

    expect(mockTrack).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(AI_FIRST_TOUCH_STORAGE_KEY)).toBeNull();
  });

  it("does not re-fire — or overwrite — when a first touch is already stored", () => {
    const existing: AiFirstTouch = {
      source: "claude",
      medium: "referral",
      landingPath: "/project/my-project",
      firstSeenAt: "2026-07-31T10:00:00.000Z",
    };
    window.localStorage.setItem(AI_FIRST_TOUCH_STORAGE_KEY, JSON.stringify(existing));
    setReferrer("https://chatgpt.com/c/abc");

    render(<AiReferrerTracker />);

    expect(mockTrack).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(AI_FIRST_TOUCH_STORAGE_KEY) ?? "null")).toEqual(
      existing
    );
  });

  it("does not send a GA event when no GA tracking id is configured", () => {
    delete process.env.NEXT_PUBLIC_GA_TRACKING_ID;
    process.env.NEXT_PUBLIC_ENV = "production";
    setReferrer("https://chatgpt.com/c/abc");

    render(<AiReferrerTracker />);

    expect(mockSendGAEvent).not.toHaveBeenCalled();
  });

  it("does not send a GA event outside production", () => {
    process.env.NEXT_PUBLIC_GA_TRACKING_ID = "G-TEST";
    process.env.NEXT_PUBLIC_ENV = "staging";
    setReferrer("https://chatgpt.com/c/abc");

    render(<AiReferrerTracker />);

    expect(mockSendGAEvent).not.toHaveBeenCalled();
  });

  it("sends the GA landing event when GA is configured in production", () => {
    process.env.NEXT_PUBLIC_GA_TRACKING_ID = "G-TEST";
    process.env.NEXT_PUBLIC_ENV = "production";
    setReferrer("https://gemini.google.com/app");

    render(<AiReferrerTracker />);

    expect(mockSendGAEvent).toHaveBeenCalledWith("event", "ai_referral_landing", {
      ai_source: "gemini",
      ai_source_medium: "referral",
      ai_landing_path: window.location.pathname,
    });
  });

  describe("GA user properties", () => {
    const enableGa = () => {
      process.env.NEXT_PUBLIC_GA_TRACKING_ID = "G-TEST";
      process.env.NEXT_PUBLIC_ENV = "production";
    };

    it("sets the attribution as GA user properties on the landing itself", () => {
      enableGa();
      setReferrer("https://gemini.google.com/app");

      render(<AiReferrerTracker />);

      expect(mockSendGAEvent).toHaveBeenCalledWith("set", "user_properties", {
        ai_source: "gemini",
        ai_source_medium: "referral",
        ai_first_touch_at: expect.any(String),
      });
    });

    it("re-applies the stored attribution for a returning visitor without re-firing the landing", () => {
      enableGa();
      const existing: AiFirstTouch = {
        source: "claude",
        medium: "referral",
        landingPath: "/project/my-project",
        firstSeenAt: "2026-07-31T10:00:00.000Z",
      };
      window.localStorage.setItem(AI_FIRST_TOUCH_STORAGE_KEY, JSON.stringify(existing));
      setReferrer("");

      render(<AiReferrerTracker />);

      expect(mockSendGAEvent).toHaveBeenCalledTimes(1);
      expect(mockSendGAEvent).toHaveBeenCalledWith("set", "user_properties", {
        ai_source: "claude",
        ai_source_medium: "referral",
        ai_first_touch_at: "2026-07-31T10:00:00.000Z",
      });
      expect(mockTrack).not.toHaveBeenCalled();
    });

    it("sets nothing for a visitor with no AI first touch", () => {
      enableGa();
      setReferrer("https://twitter.com/karmahq");

      render(<AiReferrerTracker />);

      expect(mockSendGAEvent).not.toHaveBeenCalled();
    });
  });
});
