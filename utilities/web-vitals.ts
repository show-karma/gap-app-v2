/**
 * Web Vitals Reporting Utility
 *
 * Registers handlers for Core Web Vitals (LCP, INP, CLS) and sends
 * metrics via navigator.sendBeacon to a configurable endpoint.
 *
 * NOTE: The `web-vitals` package is NOT currently installed.
 * To use this utility, add it as a dependency:
 *   pnpm add web-vitals
 */

import type { CLSMetric, INPMetric, LCPMetric, Metric } from "web-vitals";

const VITALS_ENDPOINT = process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT || "/api/web-vitals";

interface WebVitalPayload {
  name: string;
  value: number;
  rating: string;
  delta: number;
  id: string;
  navigationType: string;
  route: string;
  timestamp: number;
}

function getRoutePath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname;
}

function sendMetric(metric: Metric): void {
  const payload: WebVitalPayload = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    route: getRoutePath(),
    timestamp: Date.now(),
  };

  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(VITALS_ENDPOINT, body);
  } else if (typeof fetch !== "undefined") {
    fetch(VITALS_ENDPOINT, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {
      // Silently fail - metrics reporting should not break the app
    });
  }
}

/**
 * Register Core Web Vitals reporting handlers.
 * Call this once in the app entry point (e.g., in a layout or _app component).
 *
 * Example:
 *   import { reportWebVitals } from "@/utilities/web-vitals";
 *   reportWebVitals();
 */
export function reportWebVitals(): void {
  if (typeof window === "undefined") return;

  import("web-vitals").then(({ onLCP, onINP, onCLS }) => {
    onLCP((metric: LCPMetric) => sendMetric(metric));
    onINP((metric: INPMetric) => sendMetric(metric));
    onCLS((metric: CLSMetric) => sendMetric(metric));
  });
}
