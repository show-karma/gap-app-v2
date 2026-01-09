"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash.debounce";
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { fundingPlatformService } from "@/services/fundingPlatformService";
import type { IFundingApplication, IFundingProgramConfig } from "@/types/funding-platform";
import {
  type ApplicationSummaryField,
  extractAmountField,
  extractApplicationSummary,
} from "@/utilities/form-schema-helpers";

interface StatusChangeInlineProps {
  status: string;
  onConfirm: (reason?: string, approvedAmount?: string, approvedCurrency?: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  isReasonRequired?: boolean;
  application?: IFundingApplication;
  programConfig?: IFundingProgramConfig | null;
}

const statusLabels: Record<string, string> = {
  revision_requested: "Request Revision",
  approved: "Approve Application",
  rejected: "Reject Application",
  pending: "Set as Pending",
};

const statusDescriptions: Record<string, string> = {
  revision_requested: "Request the applicant to revise their application",
  approved: "Approve this application",
  rejected: "Reject this application",
  pending: "Set this application back to pending",
};

// Helper to extract currency from API response (handles multiple possible response structures)
const extractCurrency = (fundingDetails: {
  currency?: string;
  data?: { currency?: string };
  fundingDetails?: { currency?: string };
  details?: { currency?: string };
}): string | undefined => {
  return (
    fundingDetails?.currency ||
    fundingDetails?.data?.currency ||
    fundingDetails?.fundingDetails?.currency ||
    fundingDetails?.details?.currency
  );
};

export const StatusChangeInline: FC<StatusChangeInlineProps> = ({
  status,
  onConfirm,
  onCancel,
  isSubmitting = false,
  isReasonRequired = false,
  application,
  programConfig,
}) => {
  const [reason, setReason] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approvedCurrency, setApprovedCurrency] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [currencyError, setCurrencyError] = useState<string | null>(null);
  const [isCurrencyFromAPI, setIsCurrencyFromAPI] = useState(false);
  const [isAmountPreFilled, setIsAmountPreFilled] = useState(false);

  // Extract programId and chainId from application object
  const programId = application?.programId;
  const chainId = application?.chainID;

  // When status is "approved", amount and currency are required
  const isApprovalStatus = status === "approved";

  // Extract requested amount from application data for pre-filling
  const extractedAmount = useMemo(() => {
    if (!isApprovalStatus || !application?.applicationData) {
      return null;
    }
    return extractAmountField(application.applicationData, programConfig?.formSchema);
  }, [isApprovalStatus, application?.applicationData, programConfig?.formSchema]);

  // Extract application summary for context display
  const applicationSummary = useMemo((): ApplicationSummaryField[] => {
    if (!isApprovalStatus || !application?.applicationData || !programConfig?.formSchema) {
      return [];
    }
    return extractApplicationSummary(application.applicationData, programConfig.formSchema, 5);
  }, [isApprovalStatus, application?.applicationData, programConfig?.formSchema]);

  const getTemplateContent = useCallback((): string => {
    if (!programConfig?.formSchema?.settings) return "";

    if (status === "approved" && programConfig.formSchema.settings.approvalEmailTemplate) {
      return programConfig.formSchema.settings.approvalEmailTemplate;
    }
    if (status === "rejected" && programConfig.formSchema.settings.rejectionEmailTemplate) {
      return programConfig.formSchema.settings.rejectionEmailTemplate;
    }
    return "";
  }, [programConfig?.formSchema?.settings, status]);

  useEffect(() => {
    const templateContent = getTemplateContent();
    if (templateContent) {
      setReason(templateContent);
    }
  }, [getTemplateContent]);

  const isReasonActuallyRequired = isReasonRequired || status === "revision_requested";

  // Validate approved amount
  const validateAmount = useCallback((value: string): boolean => {
    if (!value || value.trim() === "") {
      return false;
    }
    const trimmedValue = value.trim();
    const num = Number.parseFloat(trimmedValue);
    return !Number.isNaN(num) && num > 0 && Number.isFinite(num);
  }, []);

  // Validate approved currency with format check
  const validateCurrency = useCallback((value: string): boolean => {
    if (!value || value.trim() === "") {
      return false;
    }
    const currencyRegex = /^[A-Z]+$/;
    return currencyRegex.test(value.trim().toUpperCase());
  }, []);

  // Debounced validation for amount input
  const debouncedAmountValidationRef = useRef<ReturnType<typeof debounce> | null>(null);

  const debouncedAmountValidation = useMemo(() => {
    if (debouncedAmountValidationRef.current) {
      debouncedAmountValidationRef.current.cancel();
    }

    const debounced = debounce((value: string) => {
      if (isApprovalStatus) {
        if (!value || value.trim() === "") {
          setAmountError("Approved amount is required");
        } else if (!validateAmount(value)) {
          setAmountError("Approved amount must be a valid positive number");
        } else {
          setAmountError(null);
        }
      }
    }, 300);

    debouncedAmountValidationRef.current = debounced;
    return debounced;
  }, [isApprovalStatus, validateAmount]);

  // Fetch funding details when status is "approved"
  const isFundingDetailsEnabled = isApprovalStatus && !!programId && !!chainId;

  const fundingDetailsQuery = useQuery({
    queryKey: ["program-funding-details", programId, chainId],
    queryFn: () => fundingPlatformService.programs.getFundingDetails(programId!, chainId!),
    enabled: isFundingDetailsEnabled,
  });

  const isLoadingCurrency = fundingDetailsQuery.isPending && isFundingDetailsEnabled;

  // Pre-fill amount from application data
  useEffect(() => {
    if (isApprovalStatus && extractedAmount) {
      setApprovedAmount((current) => {
        if (current.trim()) return current;
        setIsAmountPreFilled(true);
        return String(extractedAmount.value);
      });
    }
  }, [isApprovalStatus, extractedAmount]);

  // Handle funding details data when it arrives
  useEffect(() => {
    if (fundingDetailsQuery.data && isApprovalStatus) {
      const currency = extractCurrency(fundingDetailsQuery.data);
      if (currency) {
        const normalizedCurrency = currency.trim().toUpperCase();
        const currencyRegex = /^[A-Z]+$/;
        const isValid = currencyRegex.test(normalizedCurrency);
        setApprovedCurrency((current) => (current.trim() ? current : normalizedCurrency));
        setIsCurrencyFromAPI(isValid);
        setCurrencyError(isValid ? null : "Currency must be a valid code (e.g., USD, ETH, USDC)");
      }
    }

    if (fundingDetailsQuery.isError && isApprovalStatus) {
      errorManager("Failed to fetch funding details", fundingDetailsQuery.error, {
        programId: application?.programId,
        chainId: application?.chainID,
      });
      setIsCurrencyFromAPI(false);
    }
  }, [
    isApprovalStatus,
    fundingDetailsQuery.data,
    fundingDetailsQuery.isError,
    fundingDetailsQuery.error,
    application?.programId,
    application?.chainID,
  ]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      if (debouncedAmountValidationRef.current) {
        debouncedAmountValidationRef.current.cancel();
      }
    };
  }, []);

  const handleAmountChange = (value: string) => {
    setApprovedAmount(value);
    setIsAmountPreFilled(false);
    if (value && value.trim() !== "" && validateAmount(value)) {
      setAmountError(null);
    }
    debouncedAmountValidation(value);
  };

  const handleCurrencyChange = (value: string) => {
    setApprovedCurrency(value);
    setIsCurrencyFromAPI(false);
    if (isApprovalStatus) {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        setCurrencyError("Approved currency is required");
      } else {
        const normalizedValue = trimmedValue.toUpperCase();
        if (!validateCurrency(normalizedValue)) {
          setCurrencyError("Currency must be a valid code (e.g., USD, ETH, USDC)");
        } else {
          setCurrencyError(null);
        }
      }
    }
  };

  const handleConfirm = async () => {
    if (isReasonActuallyRequired && !reason.trim()) {
      return;
    }

    if (isApprovalStatus) {
      const amountValid = validateAmount(approvedAmount);
      const currencyValid = validateCurrency(approvedCurrency);

      if (!amountValid) {
        setAmountError("Approved amount is required and must be a valid positive number");
        return;
      }
      if (!currencyValid) {
        setCurrencyError("Approved currency is required");
        return;
      }
    }

    await onConfirm(
      reason || undefined,
      isApprovalStatus ? approvedAmount.trim() : undefined,
      isApprovalStatus ? approvedCurrency.trim().toUpperCase() : undefined
    );
  };

  const handleCancel = useCallback(() => {
    if (!isSubmitting) {
      if (debouncedAmountValidationRef.current) {
        debouncedAmountValidationRef.current.cancel();
      }
      onCancel();
    }
  }, [isSubmitting, onCancel]);

  // Check if form is valid for submission
  const isFormValid = useMemo(() => {
    if (isSubmitting) return false;
    if (isReasonActuallyRequired && !reason.trim()) return false;
    if (isApprovalStatus) {
      return validateAmount(approvedAmount) && validateCurrency(approvedCurrency);
    }
    return true;
  }, [
    isSubmitting,
    isReasonActuallyRequired,
    reason,
    isApprovalStatus,
    approvedAmount,
    approvedCurrency,
    validateAmount,
    validateCurrency,
  ]);

  const statusColor =
    status === "approved"
      ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
      : status === "rejected"
        ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
        : "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20";

  return (
    <div className={`mt-4 rounded-lg border ${statusColor} p-4`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
            status === "approved"
              ? "bg-green-100 dark:bg-green-900"
              : status === "rejected"
                ? "bg-red-100 dark:bg-red-900"
                : "bg-yellow-100 dark:bg-yellow-900"
          }`}
        >
          <ExclamationTriangleIcon
            className={`h-4 w-4 ${
              status === "approved"
                ? "text-green-600 dark:text-green-400"
                : status === "rejected"
                  ? "text-red-600 dark:text-red-400"
                  : "text-yellow-600 dark:text-yellow-400"
            }`}
            aria-hidden="true"
          />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {statusLabels[status] || "Change Status"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {statusDescriptions[status] || "Change the status of this application."}
          </p>
        </div>
      </div>

      {/* Application Summary - Only show when approving and has summary data */}
      {isApprovalStatus && applicationSummary.length > 0 && (
        <Disclosure defaultOpen>
          {({ open }) => (
            <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <Disclosure.Button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-t-lg transition-colors">
                <span>Application Summary</span>
                <ChevronDownIcon
                  className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </Disclosure.Button>
              <Disclosure.Panel className="px-3 pb-3">
                <dl className="space-y-1.5">
                  {applicationSummary.map((field, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs">
                      <dt className="font-medium text-gray-500 dark:text-gray-400 min-w-0 shrink-0">
                        {field.label}:
                      </dt>
                      <dd
                        className={`text-gray-900 dark:text-gray-100 break-words min-w-0 ${
                          field.isAmount ? "font-semibold text-green-700 dark:text-green-400" : ""
                        }`}
                      >
                        {field.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Disclosure.Panel>
            </div>
          )}
        </Disclosure>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Approved Amount and Currency Fields - Only show when approving */}
        {isApprovalStatus && (
          <div className="flex gap-4">
            {/* Approved Amount */}
            <div className="flex-1">
              <label
                htmlFor="approvedAmount"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Approved Amount <span className="text-red-500">*</span>
              </label>
              <input
                id="approvedAmount"
                name="approvedAmount"
                type="number"
                step="any"
                min="0"
                aria-describedby={[amountError ? "amount-error" : null, "amount-description"]
                  .filter(Boolean)
                  .join(" ")}
                aria-invalid={!!amountError}
                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 ${amountError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                placeholder="0.00"
                value={approvedAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                disabled={isSubmitting}
              />
              <div id="amount-description" className="sr-only">
                Enter the approved funding amount as a positive number
              </div>
              {amountError && (
                <p
                  id="amount-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600 dark:text-red-400"
                >
                  {amountError}
                </p>
              )}
              {isAmountPreFilled && !amountError && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  Pre-filled from application request
                </p>
              )}
            </div>

            {/* Approved Currency */}
            <div className="w-40">
              <label
                htmlFor="approvedCurrency"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Currency <span className="text-red-500">*</span>
              </label>
              {fundingDetailsQuery.isError && (
                <div className="mb-1 flex items-start gap-2 rounded border border-yellow-200 bg-yellow-50 p-1.5 dark:border-yellow-900/50 dark:bg-yellow-900/20">
                  <ExclamationTriangleIcon className="w-3 h-3 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">Auto-load failed</p>
                </div>
              )}
              {isLoadingCurrency ? (
                <input
                  id="approvedCurrency"
                  name="approvedCurrency"
                  type="text"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm sm:text-sm px-3 py-2 cursor-not-allowed"
                  value=""
                  placeholder="Loading..."
                  readOnly
                  disabled
                />
              ) : isCurrencyFromAPI ? (
                <input
                  id="approvedCurrency"
                  name="approvedCurrency"
                  type="text"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm sm:text-sm px-3 py-2 cursor-not-allowed"
                  value={approvedCurrency}
                  readOnly
                  disabled
                />
              ) : (
                <input
                  id="approvedCurrency"
                  name="approvedCurrency"
                  type="text"
                  aria-describedby={currencyError ? "currency-error" : "currency-info"}
                  aria-invalid={!!currencyError}
                  className={`block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 ${
                    currencyError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                  }`}
                  placeholder="e.g., USD"
                  value={approvedCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  disabled={isSubmitting}
                />
              )}
              {currencyError && (
                <p
                  id="currency-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600 dark:text-red-400"
                >
                  {currencyError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Reason Field - Full width */}
        <div>
          <label
            htmlFor="reason"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Reason{" "}
            {isReasonActuallyRequired ? <span className="text-red-500">*</span> : "(Optional)"}
          </label>
          <div className={isSubmitting ? "opacity-50 pointer-events-none" : ""}>
            <MarkdownEditor
              id="reason"
              value={reason}
              onChange={setReason}
              placeholder={
                status === "revision_requested"
                  ? "Explain what needs to be revised..."
                  : status === "rejected"
                    ? "Explain why the application is rejected..."
                    : status === "approved"
                      ? "Add any notes about this decision..."
                      : "Add any notes about this decision..."
              }
              height={200}
              minHeight={150}
              disabled={isSubmitting}
              aria-describedby="reason-description"
            />
          </div>
          <p id="reason-description" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {status === "revision_requested"
              ? "The applicant will see this message and can update their application."
              : status === "rejected"
                ? "If provided, this message will be sent to the applicant via email."
                : status === "approved"
                  ? "This content will be sent to the applicant via email."
                  : "This reason will be recorded in the status history."}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex justify-end gap-3">
        <Button variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!isFormValid}
          className={
            status === "approved"
              ? "bg-green-600 hover:bg-green-700"
              : status === "rejected"
                ? "bg-red-600 hover:bg-red-700"
                : ""
          }
        >
          {isSubmitting ? "Processing..." : "Confirm"}
        </Button>
      </div>
    </div>
  );
};

export default StatusChangeInline;
