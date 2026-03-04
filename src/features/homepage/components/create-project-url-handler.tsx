"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useProjectCreateModalStore } from "@/store/modals/projectCreate";

export function CreateProjectUrlHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openProjectCreateModal } = useProjectCreateModalStore();

  useEffect(() => {
    if (searchParams.get("action") === "create-project") {
      openProjectCreateModal();

      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, openProjectCreateModal, router]);

  return null;
}
