import type { Metadata } from "next";
import { ConnectIndex } from "@/src/features/non-profits/components/connect-index";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Add Karma Find Funders to Claude or ChatGPT",
  description:
    "Pick your AI tool and follow a one-minute setup. Search foundations, pull 990 filings, and draft outreach inside Claude or ChatGPT.",
  path: "/nonprofits/find-funders/connect",
});

export default function ConnectIndexPage() {
  return <ConnectIndex />;
}
