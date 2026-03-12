"use client";

import React, { useState } from "react";
import { cn } from "@/utilities/tailwind";

interface VideoPreviewProps {
  url: string;
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).slice(0, 11) || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v.slice(0, 11);
      const embedMatch = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
  }
  return null;
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|avi)(\?.*)?$/i.test(url);
}

function YouTubePreview({ videoId }: { videoId: string }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  if (showEmbed) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg border border-border bg-black aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="Video preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-black aspect-video">
      {/* Thumbnail as default view */}
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        alt="Video thumbnail"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Play button overlay - click to try embed */}
      <button
        type="button"
        onClick={() => setShowEmbed(true)}
        className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30 hover:bg-black/40 transition-colors cursor-pointer"
      >
        <svg className="h-16 w-16 text-white drop-shadow-lg" viewBox="0 0 68 48">
          <path
            d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
            fill="#f00"
          />
          <path d="M45 24L27 14v20" fill="#fff" />
        </svg>
      </button>
      {/* Link to watch on YouTube directly */}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 text-white text-xs px-3 py-1.5 rounded-md transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        Watch on YouTube
      </a>
    </div>
  );
}

function VideoPreviewComponent({ url }: VideoPreviewProps) {
  const youtubeId = getYouTubeId(url);

  if (youtubeId) {
    return <YouTubePreview videoId={youtubeId} />;
  }

  if (isDirectVideoUrl(url)) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg border border-border bg-black aspect-video">
        <video src={url} controls className="absolute inset-0 h-full w-full object-contain">
          <track kind="captions" />
        </video>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center rounded-lg border border-border",
        "bg-muted/50 aspect-video"
      )}
    >
      <div className="text-center text-sm text-muted-foreground">
        <p className="font-medium">Video URL detected</p>
        <p className="mt-1 text-xs break-all px-4">{url}</p>
      </div>
    </div>
  );
}

export const VideoPreview = React.memo(VideoPreviewComponent);
