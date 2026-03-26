"use client";
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { Controller } from "react-hook-form";
import { DateTimePicker } from "@/components/Utilities/DateTimePicker";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { MultiEmailInput } from "@/components/Utilities/MultiEmailInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utilities/tailwind";
import type { AdminProgramFormSchema } from "../schemas/admin-form";

const SHORT_DESCRIPTION_MAX_LENGTH = 100;
const DATE_PICKER_BUTTON_CLASS = "w-full text-base";

interface AdminProgramFormFieldsProps {
  control: Control<AdminProgramFormSchema>;
  register: UseFormRegister<AdminProgramFormSchema>;
  errors: FieldErrors<AdminProgramFormSchema>;
  watch: UseFormWatch<AdminProgramFormSchema>;
  setValue: UseFormSetValue<AdminProgramFormSchema>;
  isDisabled: boolean;
  shortDescription: string;
  startDate: Date | undefined;
  createDatePickerProps: (
    fieldName: "startsAt" | "endsAt",
    field: { onChange: (value: Date | undefined) => void }
  ) => {
    onSelect: (date: Date | undefined) => void;
    clearButtonFn: () => void;
  };
}

function AriaLiveError({ error }: { error?: { message?: string } }) {
  if (!error?.message) return null;
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {`Error: ${error.message}`}
    </div>
  );
}

export function AdminProgramFormFields({
  control,
  register,
  errors,
  isDisabled,
  shortDescription,
  startDate,
  createDatePickerProps,
}: AdminProgramFormFieldsProps) {
  return (
    <>
      {/* Program Name */}
      <div className="flex w-full flex-col gap-1">
        <Label htmlFor="program-name">
          Program Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="program-name"
          placeholder="Ex: Builder Growth Program"
          {...register("name")}
          disabled={isDisabled}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? "program-name-error" : undefined}
        />
        {errors.name && (
          <p id="program-name-error" className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
        <AriaLiveError error={errors.name} />
      </div>

      {/* Program Description */}
      <Controller
        name="description"
        control={control}
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <div className="flex w-full flex-col gap-1">
            <MarkdownEditor
              label="Program Description"
              placeholder="Please provide a description of this program"
              value={value || ""}
              onChange={onChange}
              onBlur={onBlur}
              error={fieldState.error?.message}
              isRequired
              isDisabled={isDisabled}
              id="program-description"
              height={200}
              minHeight={150}
            />
            <AriaLiveError error={fieldState.error} />
          </div>
        )}
      />

      {/* Short Description */}
      <div className="flex w-full flex-col gap-1">
        <Label htmlFor="short-description">
          Program Short Description <span className="text-destructive">*</span>
        </Label>
        <Input
          id="short-description"
          placeholder="Brief description (max 100 characters)"
          maxLength={SHORT_DESCRIPTION_MAX_LENGTH}
          disabled={isDisabled}
          {...register("shortDescription")}
        />
        <div className="flex justify-between">
          {errors.shortDescription && (
            <p className="text-sm text-destructive" role="alert">
              {errors.shortDescription.message}
            </p>
          )}
          <AriaLiveError error={errors.shortDescription} />
          <p className="text-xs text-muted-foreground text-right ml-auto">
            {shortDescription?.length || 0}/{SHORT_DESCRIPTION_MAX_LENGTH}
          </p>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="dates.startsAt"
          control={control}
          render={({ field, formState }) => {
            const datePickerProps = createDatePickerProps("startsAt", field);
            return (
              <div className="flex w-full flex-col gap-2">
                <Label htmlFor="start-date">Start Date (optional)</Label>
                <DateTimePicker
                  selected={field.value}
                  onSelect={datePickerProps.onSelect}
                  timeMode="start"
                  placeholder="Pick a date (UTC)"
                  buttonClassName={cn(
                    DATE_PICKER_BUTTON_CLASS,
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                  clearButtonFn={datePickerProps.clearButtonFn}
                />
                {formState.errors.dates?.startsAt && (
                  <p className="text-sm text-destructive" role="alert">
                    {formState.errors.dates.startsAt.message}
                  </p>
                )}
                <AriaLiveError error={formState.errors.dates?.startsAt} />
              </div>
            );
          }}
        />

        <Controller
          name="dates.endsAt"
          control={control}
          render={({ field, formState }) => {
            const datePickerProps = createDatePickerProps("endsAt", field);
            return (
              <div className="flex w-full flex-col gap-2">
                <Label htmlFor="end-date">End Date (optional)</Label>
                <DateTimePicker
                  selected={field.value}
                  onSelect={datePickerProps.onSelect}
                  timeMode="end"
                  minDate={startDate}
                  placeholder="Pick a date (UTC)"
                  buttonClassName={cn(
                    DATE_PICKER_BUTTON_CLASS,
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                  clearButtonFn={datePickerProps.clearButtonFn}
                />
                {formState.errors.dates?.endsAt && (
                  <p className="text-sm text-destructive" role="alert">
                    {formState.errors.dates.endsAt.message}
                  </p>
                )}
                <AriaLiveError error={formState.errors.dates?.endsAt} />
              </div>
            );
          }}
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
          disabled={isDisabled}
          aria-invalid={errors.budget ? "true" : "false"}
          aria-describedby={errors.budget ? "program-budget-error" : undefined}
        />
        {errors.budget && (
          <p id="program-budget-error" className="text-sm text-destructive" role="alert">
            {errors.budget.message}
          </p>
        )}
        <AriaLiveError error={errors.budget} />
      </div>

      {/* Admin Emails */}
      <Controller
        name="adminEmails"
        control={control}
        render={({ field, fieldState }) => (
          <div className="flex w-full flex-col gap-1">
            <Label htmlFor="admin-emails">
              Admin Emails <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-1">
              Applicants will reply to these email addresses when responding to notifications
            </p>
            <MultiEmailInput
              emails={field.value || []}
              onChange={field.onChange}
              placeholder="Enter admin email"
              disabled={isDisabled}
              error={fieldState.error?.message}
            />
            <AriaLiveError error={fieldState.error} />
          </div>
        )}
      />

      {/* Finance Emails */}
      <Controller
        name="financeEmails"
        control={control}
        render={({ field, fieldState }) => (
          <div className="flex w-full flex-col gap-1">
            <Label htmlFor="finance-emails">
              Finance Emails <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-1">
              Finance team will be notified when milestones are verified
            </p>
            <MultiEmailInput
              emails={field.value || []}
              onChange={field.onChange}
              placeholder="Enter finance email"
              disabled={isDisabled}
              error={fieldState.error?.message}
            />
            <AriaLiveError error={fieldState.error} />
          </div>
        )}
      />

      {/* Invoice Required */}
      <Controller
        name="invoiceRequired"
        control={control}
        render={({ field, fieldState }) => (
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-2">
              Require invoices for milestones <span className="text-red-500">*</span>
            </legend>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="invoiceRequired"
                  checked={field.value === true}
                  onChange={() => field.onChange(true)}
                  disabled={isDisabled}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="invoiceRequired"
                  checked={field.value === false}
                  onChange={() => field.onChange(false)}
                  disabled={isDisabled}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
            {fieldState.error?.message && (
              <p className="text-red-500 text-sm mt-1">{fieldState.error.message}</p>
            )}
          </fieldset>
        )}
      />
    </>
  );
}
