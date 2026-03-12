"use client";

import { useQuery } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";

export function useDefaultSystemPrompt() {
  return useQuery({
    queryKey: ["judge-agent", "default-system-prompt"],
    queryFn: async () => {
      const [res, err] = await fetchData<{ prompt: string }>(
        "/v2/judge-agent/default-system-prompt",
        "GET",
        {},
        {},
        {},
        true
      );
      if (err || !res) throw new Error(err || "Failed to fetch default system prompt");
      return res.prompt;
    },
    staleTime: Infinity,
  });
}
