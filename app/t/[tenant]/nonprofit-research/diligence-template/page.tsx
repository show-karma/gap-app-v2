import type { Metadata } from "next";
import { DiligenceTemplateEditor } from "@/src/features/donor-research/components/diligence-template/DiligenceTemplateEditor";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Nonprofit Research — Diligence Questions",
  description: "Manage the diligence questions sent anonymously to nonprofits.",
  path: "/nonprofit-research/diligence-template",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <DiligenceTemplateEditor />;
}
