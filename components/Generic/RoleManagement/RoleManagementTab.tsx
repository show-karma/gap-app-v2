"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/Utilities/Button";
import { XMarkIcon, PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { Spinner } from "@/components/Utilities/Spinner";
import { cn } from "@/utilities/tailwind";

/**
 * Field configuration for role management
 */
export interface RoleFieldConfig {
  name: string;
  label: string;
  type: "text" | "email" | "wallet";
  placeholder?: string;
  required: boolean;
  validation?: (value: string) => boolean | string;
}

/**
 * Configuration for role management
 */
export interface RoleManagementConfig {
  roleName: string;
  roleDisplayName: string;
  fields: RoleFieldConfig[];
  resource: string;
  canAddMultiple?: boolean;
  maxMembers?: number;
}

/**
 * Role member data
 */
export interface RoleMember {
  id: string;
  publicAddress?: string;
  name?: string;
  email?: string;
  telegram?: string;
  assignedAt?: string;
  [key: string]: any; // Additional dynamic fields based on configuration
}

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
}) => {
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  // Initialize form data with empty values
  useEffect(() => {
    const initialData: Record<string, string> = {};
    config.fields.forEach(field => {
      initialData[field.name] = "";
    });
    setFormData(initialData);
  }, [config.fields]);

  const validateField = (field: RoleFieldConfig, value: string): string | null => {
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
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    config.fields.forEach(field => {
      const error = validateField(field, formData[field.name] || "");
      if (error) {
        errors[field.name] = error;
        isValid = false;
      }
    });

    setFormErrors(errors);
    return isValid;
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    if (formErrors[fieldName]) {
      setFormErrors(prev => ({ ...prev, [fieldName]: "" }));
    }
  };

  const handleAdd = async () => {
    if (!validateForm()) {
      return;
    }

    setIsAddingMember(true);
    try {
      await onAdd?.(formData);
      // Only reset form if onAdd succeeds (doesn't throw)

      // Reset form
      const resetData: Record<string, string> = {};
      config.fields.forEach(field => {
        resetData[field.name] = "";
      });
      setFormData(resetData);
      setFormErrors({});
      setShowAddForm(false);

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error adding member:", error);
      // Keep form data and stay open on error
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm(`Are you sure you want to remove this ${config.roleDisplayName.toLowerCase()}?`)) {
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
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getMemberDisplayValue = (member: RoleMember, fieldName: string): string => {
    const value = member[fieldName];
    if (!value) return "";

    // Format wallet addresses
    if (fieldName === "publicAddress" || fieldName === "walletAddress") {
      return `${value.slice(0, 6)}...${value.slice(-4)}`;
    }

    return value;
  };

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
            {config.roleDisplayName}s
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage {config.roleDisplayName.toLowerCase()}s for this resource
          </p>
        </div>
        {canManage && (!config.maxMembers || members.length < config.maxMembers) && (
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={isAddingMember}
            className="flex items-center space-x-2"
            aria-label={`Add new ${config.roleDisplayName.toLowerCase()}`}
            aria-expanded={showAddForm}
          >
            <PlusIcon className="h-5 w-5" aria-hidden="true" />
            <span>Add {config.roleDisplayName}</span>
          </Button>
        )}
      </div>

      {/* Add Member Form */}
      {showAddForm && canManage && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Add New {config.roleDisplayName}
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {config.fields.map((field) => (
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
              onClick={() => {
                setShowAddForm(false);
                setFormErrors({});
              }}
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
        aria-label={`${config.roleDisplayName} members list`}
      >
        {members.length === 0 ? (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No {config.roleDisplayName.toLowerCase()}s
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding a {config.roleDisplayName.toLowerCase()}.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => (
              <li key={member.id} className="px-6 py-4">
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
                          {config.fields.map((field) => {
                            const value = getMemberDisplayValue(member, field.name);
                            if (!value) return null;

                            return (
                              <div key={field.name} className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  {field.label}:
                                </span>
                                <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                  {value}
                                </span>
                              </div>
                            );
                          })}
                          {member.assignedAt && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Added: {new Date(member.assignedAt).toLocaleDateString()}
                              </span>
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