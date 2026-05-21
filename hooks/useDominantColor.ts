"use client";
import { useEffect, useState } from "react";

const cache = new Map<string, string>();

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

type Bucket = {
  count: number;
  r: number;
  g: number;
  b: number;
  sat: number;
  light: number;
};

function collectBuckets(data: Uint8ClampedArray): Map<string, Bucket> {
  // Coarse quantization (4 bits/channel → 64 buckets max) keeps similar
  // colors together instead of fragmenting JPEG artifacts into many bins.
  const buckets = new Map<string, Bucket>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 200) continue;
    const [, sat, light] = rgbToHsl(r, g, b);
    // Drop only true background pixels: near-pure-white or near-pure-black.
    if (light > 0.97 && sat < 0.08) continue;
    if (light < 0.04) continue;
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.sat += sat;
      existing.light += light;
    } else {
      buckets.set(key, { count: 1, r, g, b, sat, light });
    }
  }
  return buckets;
}

function bucketAverage(b: Bucket) {
  return {
    r: Math.round(b.r / b.count),
    g: Math.round(b.g / b.count),
    b: Math.round(b.b / b.count),
    sat: b.sat / b.count,
    light: b.light / b.count,
    count: b.count,
  };
}

function neutralFor(avgLight: number): string {
  // Soft neutrals chosen to look intentional against the app background
  // when the logo itself has no usable hue (monochrome, all-white, etc.).
  if (avgLight >= 0.6) return "#f3f4f6";
  if (avgLight <= 0.35) return "#e5e7eb";
  return "#eef0f3";
}

function extractDominant(img: HTMLImageElement): string | null {
  try {
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Track the overall lightness of the image (ignoring transparent pixels)
    // so a monochrome logo can still produce a sensible neutral container.
    let totalLight = 0;
    let totalCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue;
      const [, , l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      totalLight += l;
      totalCount += 1;
    }
    const avgLight = totalCount > 0 ? totalLight / totalCount : 1;

    const buckets = collectBuckets(data);
    if (buckets.size === 0) return neutralFor(avgLight);

    const averaged = Array.from(buckets.values()).map(bucketAverage);
    const colored = averaged.filter((b) => b.sat >= 0.25);

    // If no bucket has any meaningful saturation, treat the logo as
    // monochrome and use a neutral instead of forcing a tinted color.
    if (colored.length === 0) return neutralFor(avgLight);

    let best: ReturnType<typeof bucketAverage> | null = null;
    let bestScore = -1;
    for (const b of colored) {
      const lightPenalty = 1 - Math.abs(b.light - 0.5) * 0.6;
      const score = b.count * (0.4 + b.sat * 0.8) * Math.max(0.4, lightPenalty);
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (!best) return neutralFor(avgLight);
    return rgbToHex(best.r, best.g, best.b);
  } catch {
    return null;
  }
}

export function useDominantColor(imageUrl: string | undefined | null): string | null {
  const [color, setColor] = useState<string | null>(() =>
    imageUrl ? (cache.get(imageUrl) ?? null) : null
  );

  useEffect(() => {
    if (!imageUrl) return;
    const cached = cache.get(imageUrl);
    if (cached) {
      setColor(cached);
      return;
    }
    let cancelled = false;
    // Route remote images through the same-origin /api/img-proxy so we can
    // read pixel data without depending on the remote host's CORS headers.
    // Local /logos/* paths are already same-origin and pass through.
    const sameOriginSrc = imageUrl.startsWith("http")
      ? `/api/img-proxy?url=${encodeURIComponent(imageUrl)}`
      : imageUrl;
    const tryLoad = (src: string, withCors: boolean) => {
      const img = new Image();
      if (withCors) img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        const dominant = extractDominant(img);
        if (dominant) {
          cache.set(imageUrl, dominant);
          setColor(dominant);
        }
      };
      img.onerror = () => {
        if (cancelled) return;
        // If the proxied attempt failed (e.g., optimizer disabled), fall back
        // to a direct CORS load — works for hosts that do send the header.
        if (src === sameOriginSrc && sameOriginSrc !== imageUrl) {
          tryLoad(imageUrl, true);
        }
      };
      img.src = src;
    };
    tryLoad(sameOriginSrc, false);
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return color;
}
