"use client";
import type { Mixpanel } from "mixpanel-browser";
import { useCallback, useEffect, useRef, useState } from "react";

export interface IMixpanelEvent {
  event: string;
  properties?: Record<string, unknown>;
}

interface IUseMixpanel {
  mixpanel: {
    reportEvent: (data: IMixpanelEvent) => void;
  };
}

export const useMixpanel = (prefix = "gap"): IUseMixpanel => {
  const [mixpanel, setMixpanel] = useState<Mixpanel | undefined>();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_MIXPANEL_KEY || process.env.NEXT_PUBLIC_ENV !== "production") {
      return;
    }

    const loadMixpanel = async () => {
      if (loadedRef.current) return;
      loadedRef.current = true;
      const mp = (await import("mixpanel-browser")).default;
      mp.init(process.env.NEXT_PUBLIC_MIXPANEL_KEY!);
      setMixpanel(mp);
    };

    const timeout = setTimeout(loadMixpanel, 3000);
    const handleInteraction = () => {
      clearTimeout(timeout);
      loadMixpanel();
    };
    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("scroll", handleInteraction, { once: true });

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
    };
  }, []);

  const reportEvent = useCallback(
    (data: IMixpanelEvent): Promise<void> =>
      new Promise((resolve, reject) => {
        if (!mixpanel) {
          resolve();
          return;
        }
        mixpanel.track(`${prefix}:${data.event}`, data.properties || {}, (err) => {
          if (err && err !== 1) {
            reject(err);
          } else {
            resolve();
          }
        });
      }),
    [mixpanel, prefix]
  );

  return { mixpanel: { reportEvent } };
};
