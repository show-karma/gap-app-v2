"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import fetchData from "@/utilities/fetchData";
import type { EvaluateRequest, JudgeResult } from "../types";

export function useJudgeSubmission() {
  return useMutation({
    mutationFn: async (request: EvaluateRequest) => {
      const [res, err] = await fetchData<JudgeResult>(
        "/v2/judge-agent/evaluate",
        "POST",
        request,
        {},
        {},
        true
      );
      if (err) throw new Error(err);
      return res;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to evaluate submission");
    },
  });
}
