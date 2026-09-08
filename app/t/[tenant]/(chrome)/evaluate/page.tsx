import type { Metadata } from "next";
import { EvaluatePage } from "@/src/features/standalone-evaluation/EvaluatePage";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Evaluate Grant Applications",
  description:
    "AI-powered grant application evaluation. Iterate on your evaluation prompt against a sample application, then bulk-process a CSV of applications.",
  path: "/evaluate",
  robots: { index: false, follow: true },
});

export default function Page() {
  return <EvaluatePage />;
}
