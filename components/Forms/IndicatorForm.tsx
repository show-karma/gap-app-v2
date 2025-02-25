import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { ImpactIndicatorWithData } from "@/types/impactMeasurement";
import { useState, useEffect } from "react";
import { SearchWithValueDropdown } from "@/components/Pages/Communities/Impact/SearchWithValueDropdown";
import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import type { SubmitHandler } from "react-hook-form";

const UNIT_TYPES = ["float", "int"] as const;
type UnitType = (typeof UNIT_TYPES)[number];

const indicatorSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(50, { message: "Name must be less than 50 characters" }),
  description: z
    .string()
    .min(1, { message: "Description is required" })
    .max(500, { message: "Description must be less than 500 characters" }),
  unitOfMeasure: z.enum(UNIT_TYPES),
  programs: z
    .array(
      z.object({
        programId: z.string(),
        chainID: z.number(),
      })
    )
    .optional(),
});

export type IndicatorFormData = z.infer<typeof indicatorSchema>;

interface IndicatorFormProps {
  communityId?: string;
  preSelectedPrograms?: {
    programId: string;
    title: string;
    chainID?: number;
  }[];
  onSuccess?: (indicator: ImpactIndicatorWithData) => void;
  onError?: (error: unknown) => void;
  isLoading?: boolean;
  defaultValues?: Partial<IndicatorFormData>;
  readOnlyFields?: {
    name?: boolean;
    description?: boolean;
    unitOfMeasure?: boolean;
    programs?: boolean;
  };
  indicatorId?: string;
}

export const IndicatorForm: React.FC<IndicatorFormProps> = ({
  communityId,
  preSelectedPrograms,
  onSuccess,
  onError,
  isLoading: externalIsLoading = false,
  defaultValues,
  readOnlyFields = {},
  indicatorId,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<IndicatorFormData>({
    resolver: zodResolver(indicatorSchema),
    defaultValues,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [availablePrograms, setAvailablePrograms] = useState<GrantProgram[]>(
    []
  );
  const finalIsLoading = isLoading || externalIsLoading;

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  // Fetch programs when communityId changes (only for IndicatorsHub scenario)
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!communityId) return;

      try {
        const [result, error] = await fetchData(
          INDEXER.COMMUNITY.PROGRAMS(communityId)
        );
        if (error) throw error;

        const sortedPrograms = result.sort(
          (a: GrantProgram, b: GrantProgram) => {
            const aTitle = a.metadata?.title || "";
            const bTitle = b.metadata?.title || "";
            if (aTitle < bTitle) return -1;
            if (aTitle > bTitle) return 1;
            return 0;
          }
        );
        setAvailablePrograms(sortedPrograms);
      } catch (error) {
        console.error("Failed to fetch programs:", error);
      }
    };

    fetchPrograms();
  }, [communityId]);

  const onSubmit: SubmitHandler<IndicatorFormData> = async (data, event) => {
    event?.preventDefault();
    event?.stopPropagation();

    setIsLoading(true);
    try {
      console.log("Submitting indicator data:", {
        ...data,
        programs:
          preSelectedPrograms?.map((item) => {
            return {
              programId: item.programId,
              chainID: item.chainID,
            };
          }) ||
          data.programs ||
          [],
      });

      const [response, error] = await fetchData(
        INDEXER.INDICATORS.CREATE_OR_UPDATE(),
        "POST",
        {
          indicatorId: indicatorId,
          name: data.name,
          description: data.description,
          unitOfMeasure: data.unitOfMeasure,
          programs:
            preSelectedPrograms?.map((item) => {
              return {
                programId: item.programId,
                chainID: item.chainID,
              };
            }) ||
            data.programs ||
            [],
        }
      );

      console.log("API Response:", response);
      console.log("API Error:", error);

      if (error) throw error;

      // Check if response exists and is an array
      if (!response) {
        throw new Error(`Invalid response format: ${JSON.stringify(response)}`);
      }

      if (!response?.id) {
        throw new Error(`Invalid indicator data: ${JSON.stringify(response)}`);
      }

      // Only reset form for new indicators, not during updates
      if (!indicatorId) {
        reset();
      }

      onSuccess?.(response);
    } catch (error) {
      console.error("Failed to create or update indicator:", {
        error,
        formData: data,
        indicatorId,
      });
      errorManager(
        `Failed to ${indicatorId ? "update" : "create"} indicator`,
        error
      );
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPrograms = watch("programs") || [];

  const renderProgramSelector = () => {
    // If we have pre-selected programs (ProjectUpdate scenario)
    if (preSelectedPrograms) {
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium mb-1">
            Selected Programs
          </label>
          <div className="space-y-1">
            {preSelectedPrograms.map((program) => (
              <div
                key={program.programId}
                className="px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-md"
              >
                {program.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // If we're in the IndicatorsHub scenario
    if (communityId) {
      return (
        <div>
          <label className="block text-sm font-medium mb-1">Programs</label>
          <SearchWithValueDropdown
            onSelectFunction={(value) => {
              const selectedProgram = availablePrograms.find(
                (p) => p.programId && p.programId === value
              );
              if (!selectedProgram?.programId || !selectedProgram.chainID)
                return;

              const currentPrograms = watch("programs") || [];
              const programExists = currentPrograms.some(
                (p) => p.programId === selectedProgram.programId
              );

              if (programExists) {
                setValue(
                  "programs",
                  currentPrograms.filter(
                    (p) => p.programId !== selectedProgram.programId
                  )
                );
              } else {
                setValue("programs", [
                  ...currentPrograms,
                  {
                    programId: selectedProgram.programId,
                    chainID: selectedProgram.chainID,
                  },
                ]);
              }
            }}
            selected={selectedPrograms.map((p) => p.programId)}
            list={availablePrograms
              .filter((program) => program.programId && program.chainID)
              .map((program) => ({
                value: program.programId as string,
                title: program.metadata?.title || "Untitled Program",
              }))}
            type="programs"
            prefixUnselected="Select"
            isMultiple={true}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
        }
      }}
    >
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          {...register("name")}
          className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
          placeholder="Enter indicator name"
          readOnly={readOnlyFields.name}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          {...register("description")}
          className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
          placeholder="Enter indicator description"
          rows={2}
          readOnly={readOnlyFields.description}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Unit Type</label>
        <select
          {...register("unitOfMeasure")}
          className="w-full p-2 border rounded-md bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
          disabled={readOnlyFields.unitOfMeasure}
        >
          {UNIT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
        {errors.unitOfMeasure && (
          <p className="text-red-500 text-sm mt-1">
            {errors.unitOfMeasure.message}
          </p>
        )}
      </div>

      {renderProgramSelector()}

      <Button
        type="submit"
        disabled={finalIsLoading}
        isLoading={finalIsLoading}
        className="w-full"
      >
        {indicatorId ? "Update Indicator" : "Create Indicator"}
      </Button>
    </form>
  );
};
