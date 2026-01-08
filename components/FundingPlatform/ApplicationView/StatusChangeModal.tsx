"use client";

import { Dialog, Disclosure, Transition } from "@headlessui/react";
import { ChevronDownIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash.debounce";
import { type FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string, approvedAmount?: string, approvedCurrency?: string) => Promise<void>;
  status: string;
  isSubmitting?: boolean;
  isReasonRequired?: boolean;
  application?: IFundingApplication;
  programConfig?: IFundingProgramConfig | null;
}

const statusLabels: Record<string, string> = {
  revision_requested: "Request Revision",
  approved: "Approve",
  rejected: "Reject",
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

const StatusChangeModal: FC<StatusChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  status,
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
    // formSchema is optional - extractAmountField can work without it by searching applicationData keys directly
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
    if (isOpen) {
      const templateContent = getTemplateContent();
      if (templateContent) {
        // Prepopulate with template when modal opens or status changes
        setReason(templateContent);
      } else {
        // Clear reason if no template available
        setReason("");
      }
    } else {
      // Reset reason when modal closes
      setReason("");
    }
  }, [isOpen, getTemplateContent]);

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
    // Validate currency code format: uppercase letters only (length doesn't matter)
    const currencyRegex = /^[A-Z]+$/;
    return currencyRegex.test(value.trim().toUpperCase());
  }, []);

  // Debounced validation for amount input - use ref to persist across renders
  const debouncedAmountValidationRef = useRef<ReturnType<typeof debounce> | null>(null);

  const debouncedAmountValidation = useMemo(() => {
    // Cancel previous debounced function if it exists
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

  // Helper to reset form state
  const resetFormState = useCallback(() => {
    setReason("");
    setApprovedAmount("");
    setApprovedCurrency("");
    setAmountError(null);
    setCurrencyError(null);
    setIsCurrencyFromAPI(false);
    setIsAmountPreFilled(false);
  }, []);

  // Fetch funding details when modal opens and status is "approved"
  const isFundingDetailsEnabled = isOpen && isApprovalStatus && !!programId && !!chainId;

  const fundingDetailsQuery = useQuery({
    queryKey: ["program-funding-details", programId, chainId],
    queryFn: () => fundingPlatformService.programs.getFundingDetails(programId!, chainId!),
    enabled: isFundingDetailsEnabled,
  });

  const isLoadingCurrency = fundingDetailsQuery.isPending && isFundingDetailsEnabled;

  // Pre-fill amount from application data when modal opens
  useEffect(() => {
    if (isOpen && isApprovalStatus && extractedAmount) {
      // Only pre-fill if user hasn't already entered a value
      setApprovedAmount((current) => {
        if (current.trim()) return current;
        setIsAmountPreFilled(true);
        return String(extractedAmount.value);
      });
    }
  }, [isOpen, isApprovalStatus, extractedAmount]);

  // Handle funding details data when it arrives
  useEffect(() => {
    // Reset all form fields when modal closes
    if (!isOpen) {
      resetFormState();
      return;
    }

    // Process funding details when query succeeds
    if (fundingDetailsQuery.data && isOpen && isApprovalStatus) {
      const currency = extractCurrency(fundingDetailsQuery.data);
      if (currency) {
        // Normalize currency (trim and uppercase) to match validation requirements
        const normalizedCurrency = currency.trim().toUpperCase();
        const currencyRegex = /^[A-Z]+$/;
        const isValid = currencyRegex.test(normalizedCurrency);
        // Avoid overwriting manual user input if they already started typing
        setApprovedCurrency((current) => (current.trim() ? current : normalizedCurrency));
        // Only disable field if currency is valid - if invalid, allow manual editing
        setIsCurrencyFromAPI(isValid);
        setCurrencyError(isValid ? null : "Currency must be a valid code (e.g., USD, ETH, USDC)");
      }
    }

    // Handle error case - if currency can't be loaded, leave field empty for manual entry
    if (fundingDetailsQuery.isError && isOpen && isApprovalStatus) {
      errorManager("Failed to fetch funding details", fundingDetailsQuery.error, {
        programId: application?.programId,
        chainId: application?.chainID,
      });
      setIsCurrencyFromAPI(false);
    }
  }, [
    isOpen,
    isApprovalStatus,
    fundingDetailsQuery.data,
    fundingDetailsQuery.isError,
    fundingDetailsQuery.error,
    application?.programId,
    application?.chainID,
    resetFormState,
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
    // Clear pre-fill state when user manually edits
    setIsAmountPreFilled(false);
    // Clear error immediately on change for better UX
    if (value && value.trim() !== "" && validateAmount(value)) {
      setAmountError(null);
    }
    // Debounce validation to avoid excessive error messages while typing
    debouncedAmountValidation(value);
  };

  const handleCurrencyChange = (value: string) => {
    // Don't normalize while typing - only normalize on blur/submit for better UX
    setApprovedCurrency(value);
    // Allow editing when user manually changes the currency
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
    // If reason is required but not provided, don't proceed
    if (isReasonActuallyRequired && !reason.trim()) {
      return;
    }

    // If status is approved, validate amount and currency
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
    // Form will be reset when modal closes (handled by parent on success or via handleClose)
  };

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      if (debouncedAmountValidationRef.current) {
        debouncedAmountValidationRef.current.cancel();
      }
      resetFormState();
      onClose();
    }
  }, [isSubmitting, resetFormState, onClose]);

  // Check if form is valid for submission - memoized to react to state changes
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

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" open={isOpen} onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div
                    className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
                      status === "approved"
                        ? "bg-green-100 dark:bg-green-900"
                        : status === "rejected"
                          ? "bg-red-100 dark:bg-red-900"
                          : "bg-yellow-100 dark:bg-yellow-900"
                    } sm:mx-0 sm:h-10 sm:w-10`}
                  >
                    <ExclamationTriangleIcon
                      className={`h-6 w-6 ${
                        status === "approved"
                          ? "text-green-600 dark:text-green-400"
                          : status === "rejected"
                            ? "text-red-600 dark:text-red-400"
                            : "text-yellow-600 dark:text-yellow-400"
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900 dark:text-white"
                    >
                      {statusLabels[status] || "Change Status"}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {statusDescriptions[status] || "Change the status of this application."}
                      </p>

                      <div className="mt-4 space-y-4">
                        {/* Application Summary - Only show when approving and has summary data */}
                        {isApprovalStatus && applicationSummary.length > 0 && (
                          <Disclosure defaultOpen>
                            {({ open }) => (
                              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <Disclosure.Button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-t-lg transition-colors">
                                  <span>Application Summary</span>
                                  <ChevronDownIcon
                                    className={`h-4 w-4 text-gray-500 transition-transform ${
                                      open ? "rotate-180" : ""
                                    }`}
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
                                            field.isAmount
                                              ? "font-semibold text-green-700 dark:text-green-400"
                                              : ""
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

                        {/* Approved Amount and Currency Fields - Only show when approving */}
                        {isApprovalStatus && (
                          <div className="space-y-4">
                            <div>
                              <label
                                htmlFor="approvedAmount"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                              >
                                Approved Amount <span className="text-red-500">*</span>
                              </label>
                              <input
                                id="approvedAmount"
                                name="approvedAmount"
                                type="number"
                                step="any"
                                min="0"
                                aria-describedby={[
                                  amountError ? "amount-error" : null,
                                  "amount-description",
                                ]
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

                            <div>
                              {fundingDetailsQuery.isError && (
                                <div className="mb-2 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-900/50 dark:bg-yellow-900/20">
                                  <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                    Currency auto-load failed. Please select manually.
                                  </p>
                                </div>
                              )}
                              <label
                                htmlFor="approvedCurrency"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                              >
                                Approved Currency <span className="text-red-500">*</span>
                              </label>
                              {isLoadingCurrency ? (
                                <input
                                  id="approvedCurrency"
                                  name="approvedCurrency"
                                  type="text"
                                  aria-describedby="currency-info"
                                  aria-invalid={false}
                                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 cursor-not-allowed"
                                  value=""
                                  placeholder="Loading currency..."
                                  readOnly
                                  disabled
                                />
                              ) : isCurrencyFromAPI ? (
                                <input
                                  id="approvedCurrency"
                                  name="approvedCurrency"
                                  type="text"
                                  aria-describedby="currency-info"
                                  aria-invalid={false}
                                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 cursor-not-allowed"
                                  value={approvedCurrency}
                                  readOnly
                                  disabled
                                />
                              ) : (
                                <input
                                  id="approvedCurrency"
                                  name="approvedCurrency"
                                  type="text"
                                  aria-describedby={
                                    currencyError ? "currency-error" : "currency-info"
                                  }
                                  aria-invalid={!!currencyError}
                                  className={`block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 ${
                                    currencyError
                                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                      : ""
                                  }`}
                                  placeholder="e.g., USD, ETH, USDC"
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
                              {isLoadingCurrency ? (
                                <p
                                  id="currency-info"
                                  className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                                >
                                  Loading currency from program funding details...
                                </p>
                              ) : isCurrencyFromAPI ? (
                                <p
                                  id="currency-info"
                                  className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                                >
                                  Currency automatically loaded from program funding details
                                </p>
                              ) : (
                                <p
                                  id="currency-info"
                                  className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                                >
                                  Enter the currency code (e.g., USD, ETH, USDC)
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Reason Field */}
                        <div>
                          <label
                            htmlFor="reason"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                          >
                            Reason{" "}
                            {isReasonActuallyRequired ? (
                              <span className="text-red-500">*</span>
                            ) : (
                              "(Optional)"
                            )}
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
                              height={300}
                              minHeight={250}
                              disabled={isSubmitting}
                              aria-describedby="reason-description"
                            />
                          </div>
                          <p
                            id="reason-description"
                            className="mt-2 text-xs text-gray-500 dark:text-gray-400"
                          >
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
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <Button
                    onClick={handleConfirm}
                    disabled={!isFormValid}
                    className={`w-full sm:w-auto sm:ml-3 ${
                      status === "approved"
                        ? "bg-green-600 hover:bg-green-700"
                        : status === "rejected"
                          ? "bg-red-600 hover:bg-red-700"
                          : ""
                    }`}
                  >
                    {isSubmitting ? "Processing..." : "Confirm"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="mt-3 w-full sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default StatusChangeModal;
