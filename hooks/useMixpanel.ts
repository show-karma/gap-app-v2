"use client";
import mp, { type Mixpanel } from "mixpanel-browser";
import { useEffect, useState } from "react";
import { getAiFirstTouchProps } from "@/utilities/aiReferrer";

export interface IMixpanelEvent {
  event: string;
  properties?: Record<string, unknown>;
}

interface IUseMixpanel {
  //   mixpanel?: Mixpanel;
  mixpanel: {
    reportEvent: (data: IMixpanelEvent) => void;
  };
}

export const useMixpanel = (prefix = "gap"): IUseMixpanel => {
  const [mixpanel, setMixpanel] = useState<Mixpanel | undefined>();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MIXPANEL_KEY && process.env.NEXT_PUBLIC_ENV === "production") {
      mp.init(process.env.NEXT_PUBLIC_MIXPANEL_KEY);
      setMixpanel(mp);
    }
  }, []);

  const reportEvent = (data: IMixpanelEvent): Promise<void> =>
    // First-touch AI attribution rides along on every event; event-level
    // properties win on key collision. Mirrors utilities/mixpanelEvent.ts.
    new Promise((resolve, reject) => {
      const properties = { ...getAiFirstTouchProps(), ...(data.properties || {}) };
      mixpanel?.track(`${prefix}:${data.event}`, properties, (err) => {
        if (err && err !== 1) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

  return { mixpanel: { reportEvent } };
};
