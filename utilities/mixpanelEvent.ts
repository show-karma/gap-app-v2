let mixpanelPromise: Promise<typeof import("mixpanel-browser")> | null = null;

function getMixpanel() {
  if (!mixpanelPromise) {
    mixpanelPromise = import("mixpanel-browser");
  }
  return mixpanelPromise;
}

export interface IMixpanelEvent {
  event: string;
  properties?: Record<string, unknown>;
}

export const mixpanelEvent = async (data: IMixpanelEvent) => {
  if (!process.env.NEXT_PUBLIC_MIXPANEL_KEY || process.env.NEXT_PUBLIC_ENV !== "production") {
    console.error("Mixpanel is not enabled");
    return;
  }
  const mp = await getMixpanel();
  mp.default.init(process.env.NEXT_PUBLIC_MIXPANEL_KEY);
  return new Promise<void>((resolve, reject) => {
    mp.default.track(`gap:${data.event}`, data.properties || {}, (err) => {
      if (err && err !== 1) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
