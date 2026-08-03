import mp from "mixpanel-browser";
import { getAiFirstTouchProps } from "@/utilities/aiReferrer";

export interface IMixpanelEvent {
  event: string;
  properties?: Record<string, unknown>;
}

export const mixpanelEvent = (data: IMixpanelEvent) => {
  // Analytics is production-only. Outside production, or when no key is set,
  // this is a deliberate no-op — not an error. Logging here spams the console
  // and trips Next's dev error overlay on every tracked view.
  if (!process.env.NEXT_PUBLIC_MIXPANEL_KEY || process.env.NEXT_PUBLIC_ENV !== "production") {
    return;
  }
  mp.init(process.env.NEXT_PUBLIC_MIXPANEL_KEY);
  const mixpanel = mp;
  // First-touch AI attribution rides along on every event, so a conversion
  // several navigations after the landing still knows it started at an answer
  // engine. Event-level properties win on key collision.
  const properties = { ...getAiFirstTouchProps(), ...(data.properties || {}) };
  return new Promise<void>((resolve, reject) => {
    mixpanel?.track(`gap:${data.event}`, properties, (err) => {
      if (err && err !== 1) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
