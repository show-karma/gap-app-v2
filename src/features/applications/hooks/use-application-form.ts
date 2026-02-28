"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { buildDynamicSchema } from "../lib/zod-schema-builder";
import type { ApplicationFormData } from "../types";

interface UseApplicationFormOptions {
  multiStep?: boolean;
  initialData?: ApplicationFormData;
}

export function useApplicationForm(
  questions: ApplicationQuestion[],
  options?: UseApplicationFormOptions
) {
  const schema = useMemo(() => buildDynamicSchema(questions), [questions]);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    setValue,
    getValues,
    trigger,
    reset,
    watch,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(schema),
    defaultValues: options?.initialData || {},
    mode: "onBlur",
  });

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (options?.initialData && Object.keys(options.initialData).length > 0) {
      reset(options.initialData);
    } else {
      reset({});
    }
  }, [options?.initialData, reset]);

  const updateField = useCallback(
    (questionId: string, value: unknown) => {
      setValue(questionId, value, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [setValue]
  );

  const validateField = useCallback(
    async (questionId: string): Promise<string | undefined> => {
      const result = await trigger(questionId);
      return result ? undefined : (errors[questionId]?.message as string);
    },
    [trigger, errors]
  );

  const validateForm = useCallback(async (): Promise<boolean> => {
    return await trigger();
  }, [trigger]);

  const setFormData = useCallback(
    (data: ApplicationFormData) => {
      reset(data, { keepDefaultValues: false });
    },
    [reset]
  );

  const resetForm = useCallback(() => {
    reset({});
    setCurrentStep(0);
  }, [reset]);

  const nextStep = useCallback(() => {
    if (options?.multiStep) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [options?.multiStep]);

  const previousStep = useCallback(() => {
    if (options?.multiStep) {
      setCurrentStep((prev) => Math.max(0, prev - 1));
    }
  }, [options?.multiStep]);

  const goToStep = useCallback(
    (step: number) => {
      if (options?.multiStep) {
        setCurrentStep(Math.max(0, step));
      }
    },
    [options?.multiStep]
  );

  return {
    control,
    handleSubmit,
    watch,
    trigger,

    formState: {
      data: getValues(),
      errors: Object.keys(errors).reduce(
        (acc, key) => {
          const error = errors[key];
          acc[key] = error?.message as string;
          return acc;
        },
        {} as Record<string, string>
      ),
      isValid,
      isDirty,
      currentStep,
    },

    updateField,
    validateField,
    validateForm,
    setFormData,
    resetForm,

    nextStep,
    previousStep,
    goToStep,
  };
}
