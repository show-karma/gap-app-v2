"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/Utilities/Button";
import { XMarkIcon, PlusIcon, UserIcon, DocumentDuplicateIcon, CheckIcon } from "@heroicons/react/24/outline";
import { Spinner } from "@/components/Utilities/Spinner";
import { cn } from "@/utilities/tailwind";
import { TelegramIcon } from "@/components/Icons";
import { formatDate } from "@/utilities/formatDate";
import type {
  RoleFieldConfig,
  RoleManagementConfig,
  RoleMember,
  RoleOption,
} from "./types";
import { getMemberRole, getRoleLabel, getRoleShortLabel } from "./helpers";

/**
 * Props for RoleManagementTab component
 */
interface RoleManagementTabProps {
  config: RoleManagementConfig;
  members: RoleMember[];
  isLoading?: boolean;
  canManage?: boolean;
  onAdd?: (data: Record<string, string>) => Promise<void>;
  onRemove?: (memberId: string) => Promise<void>;
  onRefresh?: () => void;
  // Multi-role support (optional)
  roleOptions?: RoleOption[];
  selectedRole?: string;
  onRoleChange?: (role: string) => void;
}

/**
 * Generic role management tab component
 */
export const RoleManagementTab: React.FC<RoleManagementTabProps> = ({
  config,
  members,
  isLoading = false,
  canManage = true,
  onAdd,
  onRemove,
  onRefresh,
  roleOptions,
  selectedRole,
  onRoleChange,
}) => {
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Get the active config based on selected role if roleOptions provided
  const activeConfig = useMemo(() => {
    return roleOptions && selectedRole
      ? roleOptions.find(opt => opt.value === selectedRole)?.config || config
      : config;
  }, [roleOptions, selectedRole, config]);

  // Initialize form data with empty values
  useEffect(() => {
    const initialData: Record<string, string> = {};
    activeConfig.fields.forEach(field => {
      initialData[field.name] = "";
    });
    setFormData(initialData);
  }, [activeConfig.fields]);

  const validateField = useCallback((field: RoleFieldConfig, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label} is required`;
    }

    if (field.validation) {
      const validationResult = field.validation(value);
      if (validationResult !== true) {
        return typeof validationResult === "string"
          ? validationResult
          : `Invalid ${field.label}`;
      }
    }

    // Built-in validations based on type
    if (field.type === "email" && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Invalid email format";
      }
    }

    if (field.type === "wallet" && value) {
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!walletRegex.test(value)) {
        return "Invalid wallet address format";
      }
    }

    return null;
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    activeConfig.fields.forEach(field => {
      const error = validateField(field, formData[field.name] || "");
      if (error) {
        errors[field.name] = error;
        isValid = false;
      }
    });

    setFormErrors(errors);
    return isValid;
  }, [activeConfig.fields, formData, validateField]);

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    setFormErrors(prev => {
      if (prev[fieldName]) {
        return { ...prev, [fieldName]: "" };
      }
      return prev;
    });
  }, []);

  const handleAdd = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsAddingMember(true);
    try {
      await onAdd?.(formData);
      // Only reset form if onAdd succeeds (doesn't throw)

      // Reset form
      const resetData: Record<string, string> = {};
      activeConfig.fields.forEach(field => {
        resetData[field.name] = "";
      });
      setFormData(resetData);
      setFormErrors({});
      setShowAddForm(false);

      // Reset role selection to first option if using multi-role
      if (roleOptions && roleOptions.length > 0 && onRoleChange) {
        onRoleChange(roleOptions[0].value);
      }

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error adding member:", error);

      // Provide more specific error messages based on error type
      let errorMessage = "Failed to add member. Please try again.";

      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as { response?: { status?: number; data?: { message?: string } } };
        if (apiError.response?.status === 401 || apiError.response?.status === 403) {
          errorMessage = "You don't have permission to add members.";
        } else if (apiError.response?.status === 409) {
          errorMessage = "This member already exists.";
        } else if (apiError.response?.status === 400) {
          errorMessage = apiError.response?.data?.message || "Invalid member data.";
        }
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      // Display error to user via console (parent component should handle toast)
      console.error("Add member error:", errorMessage);

      // Keep form data and stay open on error so user can retry
    } finally {
      setIsAddingMember(false);
    }
  }, [validateForm, onAdd, activeConfig.fields, roleOptions, onRoleChange, onRefresh, formData]);

  const handleCancelAdd = useCallback(() => {
    setShowAddForm(false);
    setFormErrors({});
    // Reset role selection to first option if using multi-role
    if (roleOptions && roleOptions.length > 0 && onRoleChange) {
      onRoleChange(roleOptions[0].value);
    }
  }, [roleOptions, onRoleChange]);

  const handleRemove = useCallback(async (memberId: string) => {
    // Find member and extract role information for better UX in confirmation dialog
    const member = members.find(m => m.id === memberId);
    const memberName = member?.name || "this member";
    const memberRole = getMemberRole(member);

    // Build confirmation message with role badge if available
    let confirmMessage = `Are you sure you want to remove ${memberName}`;
    if (memberRole) {
      confirmMessage += ` (${getRoleLabel(memberRole)})`;
    }
    confirmMessage += "?";

    if (!confirm(confirmMessage)) {
      return;
    }

    setRemovingMemberId(memberId);
    try {
      await onRemove?.(memberId);

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error removing member:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to remove member. Please try again.";

      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as { response?: { status?: number; data?: { message?: string } } };
        if (apiError.response?.status === 401 || apiError.response?.status === 403) {
          errorMessage = "You don't have permission to remove members.";
        } else if (apiError.response?.status === 404) {
          errorMessage = "Member not found. It may have already been removed.";
        }
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      // Log detailed error (parent component should handle toast)
      console.error("Remove member error:", errorMessage);
    } finally {
      setRemovingMemberId(null);
    }
  }, [config.roleDisplayName, onRemove, onRefresh, members]);

  const getMemberDisplayValue = useCallback((member: RoleMember, fieldName: string): string => {
    const value = member[fieldName];
    if (!value) return "";

    // Format wallet addresses
    if (fieldName === "publicAddress" || fieldName === "walletAddress") {
      return `${value.slice(0, 6)}...${value.slice(-4)}`;
    }

    return value;
  }, []);

  const handleCopyAddress = useCallback(async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {roleOptions && roleOptions.length > 0 ? "Reviewers" : `${config.roleDisplayName}s`}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {roleOptions && roleOptions.length > 0
              ? "Manage reviewers for this resource"
              : `Manage ${config.roleDisplayName.toLowerCase()}s for this resource`
            }
          </p>
        </div>
        {canManage && (!config.maxMembers || members.length < config.maxMembers) && (
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={isAddingMember}
            className="flex items-center space-x-2"
            aria-label={roleOptions && roleOptions.length > 0 ? "Add new reviewer" : `Add new ${config.roleDisplayName.toLowerCase()}`}
            aria-expanded={showAddForm}
          >
            <PlusIcon className="h-5 w-5" aria-hidden="true" />
            <span>{roleOptions && roleOptions.length > 0 ? "Add Reviewer" : `Add ${config.roleDisplayName}`}</span>
          </Button>
        )}
      </div>

      {/* Add Member Form */}
      {showAddForm && canManage && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Add New {activeConfig.roleDisplayName}
          </h4>

          {/* Role Selector (if multi-role support enabled) */}
          {roleOptions && roleOptions.length > 0 && onRoleChange && selectedRole && (
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Type
              </label>
              <div className="flex flex-wrap gap-4">
                {roleOptions.map((option) => (
                  <label key={option.value} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="roleType"
                      value={option.value}
                      checked={selectedRole === option.value}
                      onChange={(e) => onRoleChange(e.target.value)}
                      disabled={isAddingMember}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeConfig.fields.map((field) => (
              <div key={field.name}>
                <label
                  htmlFor={field.name}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  id={field.name}
                  type={field.type === "email" ? "email" : "text"}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={isAddingMember}
                  aria-invalid={!!formErrors[field.name]}
                  aria-describedby={formErrors[field.name] ? `${field.name}-error` : undefined}
                  aria-required={field.required}
                  className={cn(
                    "block w-full rounded-md border-gray-300 dark:border-gray-600",
                    "bg-white dark:bg-gray-700",
                    "text-gray-900 dark:text-gray-100",
                    "shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    formErrors[field.name] && "border-red-500 focus:border-red-500 focus:ring-red-500"
                  )}
                />
                {formErrors[field.name] && (
                  <p
                    id={`${field.name}-error`}
                    className="mt-1 text-xs text-red-600 dark:text-red-400"
                    role="alert"
                    aria-live="polite"
                  >
                    {formErrors[field.name]}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center space-x-3">
            <Button
              onClick={handleAdd}
              disabled={isAddingMember}
              className="flex items-center space-x-2"
            >
              {isAddingMember ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  <span>Add</span>
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={handleCancelAdd}
              disabled={isAddingMember}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div
        className="bg-white dark:bg-gray-900 shadow overflow-hidden sm:rounded-md"
        role="region"
        aria-label={roleOptions && roleOptions.length > 0 ? "Reviewers list" : `${config.roleDisplayName} members list`}
      >
        {members.length === 0 ? (
          <div className="text-center py-12  bg-white dark:bg-gray-800">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              {roleOptions && roleOptions.length > 0 ? "No reviewers" : `No ${config.roleDisplayName.toLowerCase()}s`}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {roleOptions && roleOptions.length > 0
                ? "Get started by adding a reviewer."
                : `Get started by adding a ${config.roleDisplayName.toLowerCase()}.`
              }
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => (
              <li key={member.id} className="px-6 py-4 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col space-y-1">
                          {/* Display all information clearly */}

                          {/* Name - Primary display with role badge */}
                          {member.name && (
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {member.name}
                              </div>
                              {getMemberRole(member) && (
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                  getMemberRole(member) === "program"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                )}>
                                  {getRoleShortLabel(getMemberRole(member))}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Email and Telegram on same line */}
                          {(member.email || member.telegram) && (
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              {member.email && <span>{member.email}</span>}
                              {member.email && member.telegram && (
                                <span className="mx-2 text-gray-400 dark:text-gray-500">|</span>
                              )}
                              {member.telegram && (
                                <span className="flex items-center space-x-1">
                                  <TelegramIcon className="h-4 w-4" />
                                  <span>{member.telegram?.[0] === '@' ? '' : '@'}{member.telegram}</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Copiable address */}
                          {(member.publicAddress || member.walletAddress) && (
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <button
                                onClick={() => handleCopyAddress(member.publicAddress || member.walletAddress || '')}
                                className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group"
                                title="Click to copy address"
                              >
                                <span>
                                  {getMemberDisplayValue(member, member.publicAddress ? "publicAddress" : "walletAddress")}
                                </span>
                                {copiedAddress === (member.publicAddress || member.walletAddress) ? (
                                  <CheckIcon className="h-3 w-3 text-green-500" />
                                ) : (
                                  <DocumentDuplicateIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                            </div>
                          )}

                          {/* Added date */}
                          {member.assignedAt && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              Added {formatDate(member.assignedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleRemove(member.id)}
                      disabled={removingMemberId === member.id}
                      aria-label={`Remove ${config.roleDisplayName.toLowerCase()} ${member.name || member.publicAddress || member.id}`}
                      className={cn(
                        "ml-4 p-2 rounded-md",
                        "text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400",
                        "hover:bg-gray-100 dark:hover:bg-gray-800",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-colors duration-200"
                      )}
                    >
                      {removingMemberId === member.id ? (
                        <Spinner className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
