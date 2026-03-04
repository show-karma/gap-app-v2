"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useProjectCreateModalStore } from "@/store/modals/projectCreate";

export function CreateProjectUrlHandler() {
  const searchParams = useSearchParams();
  const { openProjectCreateModal } = useProjectCreateModalStore();

  useEffect(() => {
    if (searchParams.get("action") === "create-project") {
      openProjectCreateModal();

      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [searchParams, openProjectCreateModal]);

  return null;
}
