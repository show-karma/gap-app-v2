"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import { AdminProgramFormFields } from "@/src/features/program-registry/components/admin-program-form-fields";
import { useAdminProgramForm } from "@/src/features/program-registry/hooks/use-admin-program-form";
import { PAGES } from "@/utilities/pages";

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
  const router = useRouter();
  const {
    data: community,
    isLoading: isLoadingCommunity,
    error: communityError,
  } = useCommunityDetails(communityId);

  const {
    form,
    onSubmit,
    isSubmitting,
    isDisabled,
    shortDescription,
    startDate,
    createDatePickerProps,
  } = useAdminProgramForm({
    mode: "create",
    community,
    onSuccess: (result) => {
      onSuccess();
      onClose();
      if (result.programId) {
        router.push(PAGES.MANAGE.FUNDING_PLATFORM.SETUP(communityId, result.programId));
      }
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
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
            <AdminProgramFormFields
              control={control}
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
              isDisabled={isDisabled}
              shortDescription={shortDescription}
              startDate={startDate}
              createDatePickerProps={createDatePickerProps}
            />
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
