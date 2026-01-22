"use client";

import { useEffect, useState } from "react";

interface CountryData {
  country: string | null;
  isLoading: boolean;
  error: string | null;
}

// ipinfo.io supports HTTPS and has a generous free tier (50k req/month)
const GEOLOCATION_API = "https://ipinfo.io/json?token=";
const FALLBACK_COUNTRY = "US";

export function useCountryDetection(): CountryData {
  const [data, setData] = useState<CountryData>({
    country: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch(GEOLOCATION_API);
        if (!response.ok) throw new Error("Geolocation failed");

        const result = await response.json();
        setData({
          country: result.country || FALLBACK_COUNTRY,
          isLoading: false,
          error: null,
        });
      } catch {
        // Fallback to browser locale
        const locale = navigator.language || "en-US";
        const countryFromLocale = locale.split("-")[1]?.toUpperCase();

        setData({
          country: countryFromLocale || FALLBACK_COUNTRY,
          isLoading: false,
          error: "Using fallback country detection",
        });
      }
    };

    detectCountry();
  }, []);

  return data;
}
