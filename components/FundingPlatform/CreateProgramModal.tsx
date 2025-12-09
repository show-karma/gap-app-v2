"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { useAuth } from "@/hooks/useAuth";
import { type CreateProgramFormSchema, createProgramSchema } from "@/schemas/programFormSchema";
import { ProgramRegistryService } from "@/services/programRegistry.service";
import type { CreateProgramFormData } from "@/types/program-registry";
import { formatDate } from "@/utilities/formatDate";
import { MESSAGES } from "@/utilities/messages";

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  onSuccess: () => void;
}

export function CreateProgramModal({
  isOpen,
  onClose,
  communityId,
  onSuccess,
}: CreateProgramModalProps) {
  const { address, isConnected } = useAccount();
  const { authenticated: isAuth, login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    data: community,
    isLoading: isLoadingCommunity,
    error: communityError,
  } = useCommunityDetails(communityId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    reset,
  } = useForm<CreateProgramFormSchema>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      name: "",
      description: "",
      shortDescription: "",
      dates: {
        startsAt: undefined,
        endsAt: undefined,
      },
      budget: undefined,
    },
  });

  const onSubmit = async (data: CreateProgramFormSchema) => {
    if (!isConnected || !isAuth) {
      login?.();
      return;
    }

    if (!community) {
      toast.error("Failed to load community data");
      return;
    }

    if (!address) {
      toast.error("Wallet address is required");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build metadata using service
      const metadata = ProgramRegistryService.buildProgramMetadata(
        data as CreateProgramFormData,
        community
      );

      // Create program using service
      const result = await ProgramRegistryService.createProgram(
        address,
        community.chainID,
        metadata
      );

      if (result.requiresManualApproval) {
        toast.success(
          "Program created successfully. Please approve it manually from the manage programs page.",
          { duration: 10000 }
        );
        reset();
        onSuccess();
        onClose();
        return;
      }

      // Auto-approve the program
      try {
        await ProgramRegistryService.approveProgram(result.programId);
        toast.success("Program created and approved successfully!");
      } catch (approveError: any) {
        console.error("Error during auto-approval:", approveError);
        toast.success(
          "Program created successfully, but auto-approval failed. Please approve it manually from the manage programs page.",
          { duration: 10000 }
        );
      }

      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.message;
      if (errorMessage?.includes("already exists")) {
        toast.error("A program with this name already exists");
      } else {
        errorManager(MESSAGES.PROGRAM_REGISTRY.CREATE.ERROR(data.name), error, {
          address,
          data,
        });
        toast.error("Failed to create program. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Program</DialogTitle>
        </DialogHeader>

        {isLoadingCommunity ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : communityError ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-destructive mb-4">
              Failed to load community data. Please try again.
            </p>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : !community ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground mb-4">Community not found.</p>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Program Name */}
            <div className="flex w-full flex-col gap-1">
              <Label htmlFor="program-name">
                Program Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="program-name"
                placeholder="Ex: Super cool Program"
                {...register("name")}
                disabled={isSubmitting}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            {/* Program Description */}
            <div className="flex w-full flex-col gap-1">
              <Label htmlFor="program-description">
                Program Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="program-description"
                className="min-h-[120px] max-h-[240px] resize-y"
                placeholder="Please provide a description of this program"
                {...register("description")}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Short Description */}
            <div className="flex w-full flex-col gap-1">
              <Label htmlFor="short-description">
                Program Short Description <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  (100 characters max)
                </span>
              </Label>
              <Input
                id="short-description"
                placeholder="Brief description (max 100 characters)"
                maxLength={100}
                {...register("shortDescription")}
                disabled={isSubmitting}
              />
              <div className="flex justify-between items-center">
                {errors.shortDescription && (
                  <p className="text-sm text-destructive">{errors.shortDescription.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {watch("shortDescription")?.length || 0}/100
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="dates.startsAt"
                control={control}
                render={({ field, formState }) => (
                  <div className="flex w-full flex-col gap-2">
                    <Label>Start Date (optional)</Label>
                    <DatePicker
                      selected={field.value}
                      onSelect={(date) => {
                        const currentValue = watch("dates.startsAt");
                        if (currentValue && formatDate(date) === formatDate(currentValue)) {
                          setValue("dates.startsAt", undefined, {
                            shouldValidate: true,
                          });
                          field.onChange(undefined);
                        } else {
                          setValue("dates.startsAt", date, {
                            shouldValidate: true,
                          });
                          field.onChange(date);
                        }
                      }}
                      placeholder="Pick a date"
                      buttonClassName="w-full text-base"
                      clearButtonFn={() => {
                        setValue("dates.startsAt", undefined, {
                          shouldValidate: true,
                        });
                        field.onChange(undefined);
                      }}
                    />
                    {formState.errors.dates?.startsAt && (
                      <p className="text-sm text-destructive">
                        {formState.errors.dates.startsAt.message}
                      </p>
                    )}
                  </div>
                )}
              />

              <Controller
                name="dates.endsAt"
                control={control}
                render={({ field, formState }) => (
                  <div className="flex w-full flex-col gap-2">
                    <Label>End Date (optional)</Label>
                    <DatePicker
                      selected={field.value}
                      onSelect={(date) => {
                        const currentValue = watch("dates.endsAt");
                        if (currentValue && formatDate(date) === formatDate(currentValue)) {
                          setValue("dates.endsAt", undefined, {
                            shouldValidate: true,
                          });
                          field.onChange(undefined);
                        } else {
                          setValue("dates.endsAt", date, {
                            shouldValidate: true,
                          });
                          field.onChange(date);
                        }
                      }}
                      minDate={watch("dates.startsAt")}
                      placeholder="Pick a date"
                      buttonClassName="w-full text-base"
                      clearButtonFn={() => {
                        setValue("dates.endsAt", undefined, {
                          shouldValidate: true,
                        });
                        field.onChange(undefined);
                      }}
                    />
                    {formState.errors.dates?.endsAt && (
                      <p className="text-sm text-destructive">
                        {formState.errors.dates.endsAt.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Budget */}
            <div className="flex w-full flex-col gap-1">
              <Label htmlFor="program-budget">Program Budget (optional)</Label>
              <Input
                id="program-budget"
                type="number"
                min="0"
                step="1"
                placeholder="Ex: 100000"
                {...register("budget")}
                disabled={isSubmitting}
              />
              {errors.budget && <p className="text-sm text-destructive">{errors.budget.message}</p>}
            </div>

            {/* Actions */}
            <DialogFooter>
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                Create Program
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
