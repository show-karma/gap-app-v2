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

function extractDominant(img: HTMLImageElement): string | null {
  try {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const buckets = new Map<
      string,
      { count: number; r: number; g: number; b: number; score: number }
    >();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 200) continue;
      const [, sat, light] = rgbToHsl(r, g, b);
      // Skip near-white, near-black, and very desaturated pixels
      if (light > 0.95 || light < 0.08) continue;
      if (sat < 0.18) continue;
      // Bucket by quantized RGB (24 levels per channel)
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const score = sat * (1 - Math.abs(light - 0.5) * 0.6);
      const existing = buckets.get(key);
      if (existing) {
        existing.count += 1;
        existing.r += r;
        existing.g += g;
        existing.b += b;
        existing.score += score;
      } else {
        buckets.set(key, { count: 1, r, g, b, score });
      }
    }

    if (buckets.size === 0) return null;
    let best: { count: number; r: number; g: number; b: number; score: number } | null = null;
    for (const bucket of buckets.values()) {
      if (!best || bucket.score > best.score) best = bucket;
    }
    if (!best) return null;
    return rgbToHex(
      Math.round(best.r / best.count),
      Math.round(best.g / best.count),
      Math.round(best.b / best.count)
    );
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
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const dominant = extractDominant(img);
      if (dominant) {
        cache.set(imageUrl, dominant);
        setColor(dominant);
      }
    };
    img.onerror = () => {
      // CORS or network error — silently fall back
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return color;
}
