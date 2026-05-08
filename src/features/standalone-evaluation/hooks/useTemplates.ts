"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import type {
  BuiltInTemplate,
  TemplateCreateInput,
  TemplateResponse,
} from "../schemas/template.schema";
import { standaloneEvaluationService } from "../services/standaloneEvaluationService";

export const TEMPLATES_QUERY_KEYS = {
  all: ["evaluation-templates"] as const,
  user: () => [...TEMPLATES_QUERY_KEYS.all, "user"] as const,
  builtIn: () => [...TEMPLATES_QUERY_KEYS.all, "built-in"] as const,
};

export const useTemplates = () => {
  const { authenticated } = useAuth();
  return useQuery<TemplateResponse[]>({
    queryKey: TEMPLATES_QUERY_KEYS.user(),
    queryFn: () => standaloneEvaluationService.listTemplates(),
    enabled: authenticated,
    staleTime: 60_000,
  });
};

export const useBuiltInTemplates = () => {
  return useQuery<BuiltInTemplate[]>({
    queryKey: TEMPLATES_QUERY_KEYS.builtIn(),
    queryFn: () => standaloneEvaluationService.listBuiltInTemplates(),
    staleTime: 5 * 60_000,
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<TemplateResponse, Error, TemplateCreateInput>({
    mutationFn: (input) => standaloneEvaluationService.createTemplate(input),
    onSuccess: () => {
      toast.success("Template saved");
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEYS.user() });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save template");
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => standaloneEvaluationService.deleteTemplate(id),
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEYS.user() });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });
};
