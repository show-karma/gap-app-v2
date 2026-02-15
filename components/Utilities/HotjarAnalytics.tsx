"use client";
import { useEffect } from "react";

export default function HotjarAnalytics() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENV !== "production") {
      return;
    }

    let hasInitialized = false;

    // Function to initialize Hotjar after user interaction
    const initHotjar = async () => {
      if (hasInitialized) return;
      hasInitialized = true;

      const siteId = 6413981; // Replace with your Hotjar site ID
      const hotjarVersion = 6;

      try {
        const { default: Hotjar } = await import("@hotjar/browser");
        Hotjar.init(siteId, hotjarVersion);
      } catch (error) {
        console.error("Failed to initialize Hotjar:", error);
      }

      // Remove event listeners after Hotjar is initialized
      window.removeEventListener("click", initHotjar);
      window.removeEventListener("scroll", initHotjar);
    };

    // Add event listeners for user interaction (click and scroll)
    window.addEventListener("click", initHotjar, { passive: true });
    window.addEventListener("scroll", initHotjar, { passive: true });

    // Cleanup event listeners if the component unmounts before interaction
    return () => {
      window.removeEventListener("click", initHotjar);
      window.removeEventListener("scroll", initHotjar);
    };
  }, []);

  return null;
}
