import type { Metadata } from "next";
import ClaimFundsClient from "./ClaimFundsClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ClaimFundsPage() {
  return <ClaimFundsClient />;
}
