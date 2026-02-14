"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";

const ContactInfoPage = dynamic(() => import("@/components/Pages/Project/ContactInfoPage"), {
  loading: () => <DefaultLoading />,
});

/**
 * Contact Info Page (V2)
 *
 * Displays contact information for the project.
 * Uses the profile layout context for consistent navigation.
 * Only accessible to authorized users (Project Admin, Project Owner, Staff, Contract Owner).
 */
export default function ContactInfoPageV2() {
  return (
    <Suspense fallback={<DefaultLoading />}>
      <ContactInfoPage />
    </Suspense>
  );
}
