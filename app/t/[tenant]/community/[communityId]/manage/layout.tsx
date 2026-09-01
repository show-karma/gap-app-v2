import type { Metadata } from "next";
import { ManageLayoutClient } from "@/components/Manage/ManageLayoutClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return <ManageLayoutClient>{children}</ManageLayoutClient>;
}
