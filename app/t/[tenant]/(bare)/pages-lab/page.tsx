import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PagesLabClient } from "@/components/Pages/PagesLab/PagesLabClient";

export const metadata: Metadata = {
  title: "Karma Panels",
  robots: { index: false, follow: false },
};

export default function Page() {
  if (process.env.PAGES_LAB_ENABLED !== "1") notFound();
  return <PagesLabClient />;
}
