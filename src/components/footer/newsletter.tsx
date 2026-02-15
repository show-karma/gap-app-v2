"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DESKTOP_QUERY = "(min-width: 768px)";
const EMBED_ROOT_MARGIN = "300px 0px";

export function Newsletter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoadEmbed, setShouldLoadEmbed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const updateViewport = () => setIsDesktop(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (shouldLoadEmbed) return;

    const container = containerRef.current;
    if (!container) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoadEmbed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        setShouldLoadEmbed(true);
        observer.disconnect();
      },
      { rootMargin: EMBED_ROOT_MARGIN }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [shouldLoadEmbed]);

  const embedConfig = useMemo(
    () =>
      isDesktop
        ? {
            src: "https://paragraph.com/@karmahq/embed?minimal=true",
            width: 320,
            height: 45,
            title: "Subscribe to KarmaHQ via Paragraph (desktop)",
          }
        : {
            src: "https://paragraph.com/@karmahq/embed?minimal=true&vertical=true",
            width: 256,
            height: 90,
            title: "Subscribe to KarmaHQ via Paragraph (mobile)",
          },
    [isDesktop]
  );

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-base leading-6 text-foreground">Stay up to date</h3>
      <div ref={containerRef} className="min-h-[90px] md:min-h-[45px]">
        {shouldLoadEmbed ? (
          <iframe
            src={embedConfig.src}
            width={embedConfig.width}
            height={embedConfig.height}
            frameBorder="0"
            scrolling="no"
            loading="lazy"
            title={embedConfig.title}
          />
        ) : (
          <div
            className="animate-pulse rounded-md bg-muted/60"
            style={{ width: embedConfig.width, height: embedConfig.height }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
