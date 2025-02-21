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
  programs: z.array(z.string()).optional(),
});

export type IndicatorFormData = z.infer<typeof indicatorSchema>;

interface IndicatorFormProps {
  communityId?: string; // For IndicatorsHub scenario
  preSelectedPrograms?: {
    // For ProjectUpdate scenario
    id: string;
    title: string;
  }[];
  onSuccess?: (indicator: ImpactIndicatorWithData) => void;
  onError?: (error: unknown) => void;
  isLoading?: boolean;
  defaultValues?: Partial<IndicatorFormData>;
  readOnlyFields?: {
    name?: boolean;
    description?: boolean;
    unitOfMeasure?: boolean;
  };
}

export const IndicatorForm: React.FC<IndicatorFormProps> = ({
  communityId,
  preSelectedPrograms,
  onSuccess,
  onError,
  isLoading: externalIsLoading = false,
  defaultValues,
  readOnlyFields = {},
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
    defaultValues: {
      ...defaultValues,
      programs: preSelectedPrograms?.map((p) => p.id) || [],
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [availablePrograms, setAvailablePrograms] = useState<GrantProgram[]>(
    []
  );
  const finalIsLoading = isLoading || externalIsLoading;

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
      const [response, error] = await fetchData(
        INDEXER.COMMUNITY.INDICATORS.CREATE,
        "POST",
        {
          name: data.name,
          description: data.description,
          unitOfMeasure: data.unitOfMeasure,
          programs: data.programs || [],
        }
      );
      if (error) throw error;
      if (!response.length) throw new Error("No indicator returned");

      const newIndicator = response?.[0] as ImpactIndicatorWithData;
      if (!newIndicator.id) throw new Error("No indicator ID returned");

      reset();
      onSuccess?.(newIndicator);
    } catch (error) {
      errorManager("Failed to create indicator", error);
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
                key={program.id}
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
              const currentPrograms = watch("programs") || [];
              if (currentPrograms.includes(value)) {
                setValue(
                  "programs",
                  currentPrograms.filter((p) => p !== value)
                );
              } else {
                setValue("programs", [...currentPrograms, value]);
              }
            }}
            selected={selectedPrograms}
            list={availablePrograms.map((program) => ({
              value: program.id || program.programId || program._id?.$oid || "",
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
        Create Indicator
      </Button>
    </form>
  );
};
