"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";

const ContactInfoPage = dynamic(() => import("@/components/Pages/Project/ContactInfoPage"), {
  loading: () => <DefaultLoading />,
});

/**
 * Client-side contact info content wrapper.
 */
export function ContactInfoPageClient() {
  return (
    <Suspense fallback={<DefaultLoading />}>
      <ContactInfoPage />
    </Suspense>
  );
}
