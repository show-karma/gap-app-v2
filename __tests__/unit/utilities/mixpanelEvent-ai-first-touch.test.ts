/**
 * @file Tests that AI first-touch attribution is merged into every Mixpanel
 * event fired through the `mixpanelEvent` helper — this is what lets a
 * conversion that happens long after the landing still report its AI origin.
 */

import mp from "mixpanel-browser";
import {
  __resetAiFirstTouchCacheForTests,
  AI_FIRST_TOUCH_STORAGE_KEY,
  type AiFirstTouch,
} from "@/utilities/aiReferrer";
import { mixpanelEvent } from "@/utilities/mixpanelEvent";

vi.mock("mixpanel-browser");

const mockMixpanel = mp as vi.Mocked<typeof mp>;

const STORED_FIRST_TOUCH: AiFirstTouch = {
  source: "perplexity",
  medium: "referral",
  landingPath: "/project/my-project",
  firstSeenAt: "2026-07-31T10:00:00.000Z",
};

const trackedProperties = (): Record<string, unknown> =>
  mockMixpanel.track.mock.calls[0][1] as Record<string, unknown>;

describe("mixpanelEvent AI first-touch attribution", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    window.localStorage.clear();
    __resetAiFirstTouchCacheForTests();
    mockMixpanel.track = vi.fn((_event, _props, callback) => {
      if (typeof callback === "function") {
        callback(1);
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const enableProduction = () => {
    process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
    process.env.NEXT_PUBLIC_ENV = "production";
  };

  const storeFirstTouch = (firstTouch: AiFirstTouch = STORED_FIRST_TOUCH) => {
    window.localStorage.setItem(AI_FIRST_TOUCH_STORAGE_KEY, JSON.stringify(firstTouch));
  };

  it("merges the stored first touch into a later conversion event", async () => {
    enableProduction();
    storeFirstTouch();

    await mixpanelEvent({ event: "donation-completed", properties: { amount: 100 } });

    expect(mockMixpanel.track).toHaveBeenCalledWith(
      "gap:donation-completed",
      {
        amount: 100,
        ai_source: "perplexity",
        ai_source_medium: "referral",
        ai_first_touch_at: "2026-07-31T10:00:00.000Z",
      },
      expect.any(Function)
    );
  });

  it("attaches the first touch to events that carry no properties of their own", async () => {
    enableProduction();
    storeFirstTouch();

    await mixpanelEvent({ event: "propertyless-event" });

    expect(trackedProperties()).toEqual({
      ai_source: "perplexity",
      ai_source_medium: "referral",
      ai_first_touch_at: "2026-07-31T10:00:00.000Z",
    });
  });

  it("lets an explicit event property win over the first-touch value", async () => {
    enableProduction();
    storeFirstTouch();

    await mixpanelEvent({
      event: "ai-referral-landing",
      properties: { ai_source: "chatgpt" },
    });

    expect(trackedProperties().ai_source).toBe("chatgpt");
  });

  it("leaves properties untouched when the visitor has no AI first touch", async () => {
    enableProduction();

    await mixpanelEvent({ event: "organic-event", properties: { amount: 100 } });

    expect(trackedProperties()).toEqual({ amount: 100 });
  });

  it("ignores a corrupted stored value rather than polluting the event", async () => {
    enableProduction();
    window.localStorage.setItem(AI_FIRST_TOUCH_STORAGE_KEY, "{not-json");

    await mixpanelEvent({ event: "organic-event" });

    expect(trackedProperties()).toEqual({});
  });

  it("stays a no-op outside production even with a stored first touch", () => {
    process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
    process.env.NEXT_PUBLIC_ENV = "development";
    storeFirstTouch();

    expect(mixpanelEvent({ event: "dev-event" })).toBeUndefined();
    expect(mockMixpanel.init).not.toHaveBeenCalled();
    expect(mockMixpanel.track).not.toHaveBeenCalled();
  });

  it("stays a no-op when no Mixpanel key is configured", () => {
    delete process.env.NEXT_PUBLIC_MIXPANEL_KEY;
    process.env.NEXT_PUBLIC_ENV = "production";
    storeFirstTouch();

    expect(mixpanelEvent({ event: "keyless-event" })).toBeUndefined();
    expect(mockMixpanel.track).not.toHaveBeenCalled();
  });
});
