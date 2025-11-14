import mp from "mixpanel-browser"

export interface IMixpanelEvent {
  event: string
  properties?: Record<string, unknown>
}

export const mixpanelEvent = (data: IMixpanelEvent) => {
  if (!process.env.NEXT_PUBLIC_MIXPANEL_KEY || process.env.NEXT_PUBLIC_ENV !== "production") {
    console.error("Mixpanel is not enabled")
    return
  }
  mp.init(process.env.NEXT_PUBLIC_MIXPANEL_KEY)
  const mixpanel = mp
  return new Promise<void>((resolve, reject) => {
    mixpanel?.track(`gap:${data.event}`, data.properties || {}, (err) => {
      if (err && err !== 1) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
