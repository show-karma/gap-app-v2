"use client";
import mp, { type Mixpanel } from "mixpanel-browser";
import { useEffect, useState } from "react";

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
    new Promise((resolve, reject) => {
      mixpanel?.track(`${prefix}:${data.event}`, data.properties || {}, (err) => {
        if (err && err !== 1) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

  return { mixpanel: { reportEvent } };
};
