"use client";

import {
  CheckIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  PencilIcon,
  PlusIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { SlackIcon, TelegramIcon } from "@/components/Icons";
import { Button } from "@/components/Utilities/Button";
import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { formatDate } from "@/utilities/formatDate";
import { cn } from "@/utilities/tailwind";
import { getMemberRoles, getRoleShortLabel } from "./helpers";
import type {
  ReviewerRole,
  RoleFieldConfig,
  RoleManagementConfig,
  RoleMember,
  RoleOption,
} from "./types";

interface RoleManagementTabProps {
  config: RoleManagementConfig;
  members: RoleMember[];
  isLoading?: boolean;
  canManage?: boolean;
  onAdd?: (data: Record<string, string>) => Promise<void>;
  onRemove?: (memberId: string) => Promise<void>;
  onRefresh?: () => void | Promise<void>;
  roleOptions?: RoleOption[];
  // Multi-role checkbox support
  selectedRoles?: string[];
  onRolesChange?: (roles: string[]) => void;
  // Edit roles support
  onEditRoles?: (memberId: string, roles: string[]) => Promise<void>;
  // Edit contact fields (telegram/slack) for existing members
  onEditContact?: (memberId: string, patch: Record<string, string>) => Promise<void>;
  // Legacy single-role support (backward compatibility)
  selectedRole?: string;
  onRoleChange?: (role: string) => void;
}

export const RoleManagementTab: React.FC<RoleManagementTabProps> = ({
  config,
  members,
  isLoading = false,
  canManage = true,
  onAdd,
  onRemove,
  onRefresh,
  roleOptions,
  selectedRoles,
  onRolesChange,
  onEditRoles,
  onEditContact,
  selectedRole,
  onRoleChange,
}) => {
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editContactValues, setEditContactValues] = useState<Record<string, string>>({});
  const [editContactErrors, setEditContactErrors] = useState<Record<string, string>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [removeDialogMemberId, setRemoveDialogMemberId] = useState<string | null>(null);
  const [showEmptyRolesDialog, setShowEmptyRolesDialog] = useState(false);
  const [, copy] = useCopyToClipboard();
  const membersRef = useRef(members);
  membersRef.current = members;

  // Determine if we're using multi-role checkboxes or single-role radio
  const useCheckboxMode = Boolean(selectedRoles && onRolesChange);

  const activeConfig = useMemo(() => {
    if (useCheckboxMode) return config;
    return roleOptions && selectedRole
      ? roleOptions.find((opt) => opt.value === selectedRole)?.config || config
      : config;
  }, [roleOptions, selectedRole, config, useCheckboxMode]);

  useEffect(() => {
    const initialData: Record<string, string> = {};
    activeConfig.fields.forEach((field) => {
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
        return typeof validationResult === "string" ? validationResult : `Invalid ${field.label}`;
      }
    }

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

    activeConfig.fields.forEach((field) => {
      const error = validateField(field, formData[field.name] || "");
      if (error) {
        errors[field.name] = error;
        isValid = false;
      }
    });

    // Validate at least one role is selected
    if (useCheckboxMode && selectedRoles && selectedRoles.length === 0) {
      errors._roles = "Select at least one reviewer type";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  }, [activeConfig.fields, formData, validateField, useCheckboxMode, selectedRoles]);

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    setFormErrors((prev) => {
      if (prev[fieldName]) {
        return { ...prev, [fieldName]: "" };
      }
      return prev;
    });
  }, []);

  const handleRoleCheckboxChange = useCallback(
    (roleValue: string, checked: boolean) => {
      if (!onRolesChange || !selectedRoles) return;
      const newRoles = checked
        ? [...selectedRoles, roleValue]
        : selectedRoles.filter((r) => r !== roleValue);
      onRolesChange(newRoles);
      // Clear role error when user selects a role
      if (newRoles.length > 0) {
        setFormErrors((prev) => {
          if (prev._roles) {
            const { _roles: _, ...rest } = prev;
            return rest;
          }
          return prev;
        });
      }
    },
    [onRolesChange, selectedRoles]
  );

  const handleAdd = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsAddingMember(true);
    try {
      await onAdd?.(formData);

      const resetData: Record<string, string> = {};
      activeConfig.fields.forEach((field) => {
        resetData[field.name] = "";
      });
      setFormData(resetData);
      setFormErrors({});
      setShowAddForm(false);

      // Reset role selection
      if (useCheckboxMode && onRolesChange) {
        onRolesChange(["program"]);
      } else if (roleOptions && roleOptions.length > 0 && onRoleChange) {
        onRoleChange(roleOptions[0].value);
      }

      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
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

      setFormErrors({ _general: errorMessage });
    } finally {
      setIsAddingMember(false);
    }
  }, [
    validateForm,
    onAdd,
    activeConfig.fields,
    roleOptions,
    onRoleChange,
    onRolesChange,
    onRefresh,
    formData,
    useCheckboxMode,
  ]);

  const handleCancelAdd = useCallback(() => {
    setShowAddForm(false);
    setFormErrors({});
    if (useCheckboxMode && onRolesChange) {
      onRolesChange(["program"]);
    } else if (roleOptions && roleOptions.length > 0 && onRoleChange) {
      onRoleChange(roleOptions[0].value);
    }
  }, [roleOptions, onRoleChange, onRolesChange, useCheckboxMode]);

  const handleRemoveClick = useCallback((memberId: string) => {
    setRemoveDialogMemberId(memberId);
  }, []);

  const handleRemoveConfirm = useCallback(async () => {
    if (!removeDialogMemberId) return;

    setRemovingMemberId(removeDialogMemberId);
    try {
      await onRemove?.(removeDialogMemberId);
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setRemovingMemberId(null);
      setRemoveDialogMemberId(null);
    }
  }, [removeDialogMemberId, onRemove, onRefresh]);

  const editableFields = useMemo(
    () => activeConfig.fields.filter((f) => f.editable),
    [activeConfig.fields]
  );

  const handleStartEdit = useCallback(
    (memberId: string) => {
      const member = membersRef.current.find((m) => m.id === memberId);
      if (member) {
        setEditingMemberId(memberId);
        setEditRoles([...getMemberRoles(member)]);
        const initial: Record<string, string> = {};
        for (const field of editableFields) {
          const value = member[field.name];
          initial[field.name] = typeof value === "string" ? value : "";
        }
        setEditContactValues(initial);
        setEditContactErrors({});
      }
    },
    [editableFields]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMemberId(null);
    setEditRoles([]);
    setEditContactValues({});
    setEditContactErrors({});
  }, []);

  const handleEditContactFieldChange = useCallback((fieldName: string, value: string) => {
    setEditContactValues((prev) => ({ ...prev, [fieldName]: value }));
    setEditContactErrors((prev) => {
      if (prev[fieldName]) {
        return { ...prev, [fieldName]: "" };
      }
      return prev;
    });
  }, []);

  const validateEditContact = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    for (const field of editableFields) {
      const error = validateField(field, editContactValues[field.name] || "");
      if (error) {
        errors[field.name] = error;
        isValid = false;
      }
    }

    setEditContactErrors(errors);
    return isValid;
  }, [editableFields, editContactValues, validateField]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingMemberId) return;

    if (editRoles.length === 0) {
      setShowEmptyRolesDialog(true);
      return;
    }

    if (!validateEditContact()) {
      return;
    }

    const member = membersRef.current.find((m) => m.id === editingMemberId);
    const contactPatch: Record<string, string> = {};
    if (member) {
      for (const field of editableFields) {
        const newValue = editContactValues[field.name] ?? "";
        const currentValue =
          typeof member[field.name] === "string" ? (member[field.name] as string) : "";
        if (newValue !== currentValue) {
          contactPatch[field.name] = newValue;
        }
      }
    }

    const hasContactChanges = Object.keys(contactPatch).length > 0;
    const currentRoles = member ? getMemberRoles(member) : [];
    const hasRoleChanges =
      editRoles.length !== currentRoles.length ||
      !editRoles.every((r) => currentRoles.includes(r as ReviewerRole));

    setIsSavingEdit(true);
    try {
      if (hasContactChanges && onEditContact) {
        await onEditContact(editingMemberId, contactPatch);
      }
      if (hasRoleChanges && onEditRoles) {
        await onEditRoles(editingMemberId, editRoles);
      }
      setEditingMemberId(null);
      setEditRoles([]);
      setEditContactValues({});
      setEditContactErrors({});
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setIsSavingEdit(false);
    }
  }, [
    editingMemberId,
    editRoles,
    editableFields,
    editContactValues,
    validateEditContact,
    onEditContact,
    onEditRoles,
    onRefresh,
  ]);

  const handleEmptyRolesConfirm = useCallback(async () => {
    if (!editingMemberId || !onEditRoles) return;

    setShowEmptyRolesDialog(false);
    setIsSavingEdit(true);
    try {
      await onEditRoles(editingMemberId, []);
      setEditingMemberId(null);
      setEditRoles([]);
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingMemberId, onEditRoles, onRefresh]);

  const handleEditRoleToggle = useCallback((roleValue: string, checked: boolean) => {
    setEditRoles((prev) => (checked ? [...prev, roleValue] : prev.filter((r) => r !== roleValue)));
  }, []);

  const getMemberDisplayValue = useCallback((member: RoleMember, fieldName: string): string => {
    const value = member[fieldName];
    if (!value || typeof value !== "string") return "";

    if (fieldName === "publicAddress" || fieldName === "walletAddress") {
      return `${value.slice(0, 6)}...${value.slice(-4)}`;
    }

    return value;
  }, []);

  const handleCopyAddress = useCallback(
    async (address: string) => {
      const success = await copy(address, "Address copied to clipboard");
      if (success) {
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
      }
    },
    [copy]
  );

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
              : `Manage ${config.roleDisplayName.toLowerCase()}s for this resource`}
          </p>
        </div>
        {canManage && (!config.maxMembers || members.length < config.maxMembers) && (
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={isAddingMember}
            className="flex items-center space-x-2"
            aria-label={
              roleOptions && roleOptions.length > 0
                ? "Add new reviewer"
                : `Add new ${config.roleDisplayName.toLowerCase()}`
            }
            aria-expanded={showAddForm}
          >
            <PlusIcon className="h-5 w-5" aria-hidden="true" />
            <span>
              {roleOptions && roleOptions.length > 0
                ? "Add Reviewer"
                : `Add ${config.roleDisplayName}`}
            </span>
          </Button>
        )}
      </div>

      {/* Add Member Form */}
      {showAddForm && canManage && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Add New Reviewer
          </h4>

          {/* Role Selector */}
          {roleOptions && roleOptions.length > 0 && (
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Reviewer Type
              </div>
              {useCheckboxMode ? (
                <div className="flex flex-wrap gap-4">
                  {roleOptions.map((option) => (
                    <label key={option.value} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={selectedRoles?.includes(option.value) ?? false}
                        onChange={(e) => handleRoleCheckboxChange(option.value, e.target.checked)}
                        disabled={isAddingMember}
                        className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {roleOptions.map((option) => (
                    <label key={option.value} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="roleType"
                        value={option.value}
                        checked={selectedRole === option.value}
                        onChange={(e) => onRoleChange?.(e.target.value)}
                        disabled={isAddingMember}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {formErrors._roles && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
                  {formErrors._roles}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeConfig.fields.map((field) => (
              <div key={field.name}>
                {/*
                  InfoTooltip lives OUTSIDE the <label> — `InfoTooltip`
                  renders a `<button>`, and a button inside a label
                  steals click/focus events from the label's input
                  association. The wrapper div carries the layout
                  (h-5 for height stability across tooltipless and
                  tooltipped fields); the label itself stays semantic
                  (input-association only).
                */}
                <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 h-5">
                  <label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.tooltip && (
                    <InfoTooltip
                      content={field.tooltip}
                      side="top"
                      contentClassName="max-w-xs whitespace-normal"
                      className="p-0 inline-flex items-center"
                    />
                  )}
                </div>
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
                    formErrors[field.name] &&
                      "border-red-500 focus:border-red-500 focus:ring-red-500"
                  )}
                />
                {formErrors[field.name] ? (
                  <p
                    id={`${field.name}-error`}
                    className="mt-1 text-xs text-red-600 dark:text-red-400"
                    role="alert"
                    aria-live="polite"
                  >
                    {formErrors[field.name]}
                  </p>
                ) : (
                  field.helperText && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {field.helperText}
                    </p>
                  )
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
            <Button variant="secondary" onClick={handleCancelAdd} disabled={isAddingMember}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Members List */}
      <section
        className="bg-white dark:bg-gray-900 shadow overflow-hidden sm:rounded-md"
        aria-label={
          roleOptions && roleOptions.length > 0
            ? "Reviewers list"
            : `${config.roleDisplayName} members list`
        }
      >
        {members.length === 0 ? (
          <div className="text-center py-12  bg-white dark:bg-gray-800">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              {roleOptions && roleOptions.length > 0
                ? "No reviewers"
                : `No ${config.roleDisplayName.toLowerCase()}s`}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {roleOptions && roleOptions.length > 0
                ? "Get started by adding a reviewer."
                : `Get started by adding a ${config.roleDisplayName.toLowerCase()}.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => {
              const memberRoles = getMemberRoles(member);
              const isEditing = editingMemberId === member.id;

              return (
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
                            {/* Name with role badges */}
                            {member.name && (
                              <div className="flex items-center space-x-2 flex-wrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {member.name}
                                </div>
                                {!isEditing &&
                                  memberRoles.map((role) => (
                                    <span
                                      key={role}
                                      className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                        role === "program"
                                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                          : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                      )}
                                    >
                                      {getRoleShortLabel(role)}
                                    </span>
                                  ))}
                              </div>
                            )}

                            {/* Inline edit form for roles */}
                            {isEditing && roleOptions && (
                              <div className="flex items-center space-x-4 py-1">
                                {roleOptions.map((option) => (
                                  <label
                                    key={option.value}
                                    className="flex items-center cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={editRoles.includes(option.value)}
                                      onChange={(e) =>
                                        handleEditRoleToggle(option.value, e.target.checked)
                                      }
                                      disabled={isSavingEdit}
                                      className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <span className="ml-1.5 text-sm text-gray-700 dark:text-gray-300">
                                      {option.label}
                                    </span>
                                  </label>
                                ))}
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={handleSaveEdit}
                                    disabled={isSavingEdit}
                                    className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                                    aria-label="Save changes"
                                  >
                                    {isSavingEdit ? (
                                      <Spinner className="h-4 w-4" />
                                    ) : (
                                      <CheckIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    disabled={isSavingEdit}
                                    className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                    aria-label="Cancel editing"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Inline edit form for contact fields */}
                            {isEditing && onEditContact && editableFields.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
                                {editableFields.map((field) => (
                                  <div key={field.name}>
                                    {/*
                                      Tooltip OUTSIDE the <label> for
                                      the same reason as the add-form
                                      above — InfoTooltip's button
                                      breaks the label-input semantic
                                      association.
                                    */}
                                    <div className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 h-4">
                                      <label htmlFor={`edit-${member.id}-${field.name}`}>
                                        {field.label}
                                      </label>
                                      {field.tooltip && (
                                        <InfoTooltip
                                          content={field.tooltip}
                                          side="top"
                                          contentClassName="max-w-xs whitespace-normal"
                                          className="p-0 inline-flex items-center"
                                        />
                                      )}
                                    </div>
                                    <input
                                      id={`edit-${member.id}-${field.name}`}
                                      type="text"
                                      value={editContactValues[field.name] ?? ""}
                                      onChange={(e) =>
                                        handleEditContactFieldChange(field.name, e.target.value)
                                      }
                                      placeholder={field.placeholder}
                                      disabled={isSavingEdit}
                                      aria-invalid={!!editContactErrors[field.name]}
                                      className={cn(
                                        "block w-full rounded-md border-gray-300 dark:border-gray-600",
                                        "bg-white dark:bg-gray-700",
                                        "text-gray-900 dark:text-gray-100",
                                        "shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm",
                                        "disabled:opacity-50 disabled:cursor-not-allowed",
                                        editContactErrors[field.name] &&
                                          "border-red-500 focus:border-red-500 focus:ring-red-500"
                                      )}
                                    />
                                    {editContactErrors[field.name] && (
                                      <p
                                        className="mt-1 text-xs text-red-600 dark:text-red-400"
                                        role="alert"
                                        aria-live="polite"
                                      >
                                        {editContactErrors[field.name]}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Email, Telegram, Slack */}
                            {!isEditing && (member.email || member.telegram || member.slack) && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 flex-wrap gap-x-2">
                                {member.email && (
                                  <span className="flex items-center space-x-1">
                                    <EnvelopeIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                    <span>{member.email}</span>
                                  </span>
                                )}
                                {member.email && (member.telegram || member.slack) && (
                                  <span className="text-gray-400 dark:text-gray-500">|</span>
                                )}
                                {member.telegram && (
                                  <span className="flex items-center space-x-1">
                                    <TelegramIcon className="h-4 w-4" />
                                    <span>
                                      {member.telegram?.[0] === "@" ? "" : "@"}
                                      {member.telegram}
                                    </span>
                                  </span>
                                )}
                                {member.telegram && member.slack && (
                                  <span className="text-gray-400 dark:text-gray-500">|</span>
                                )}
                                {member.slack && (
                                  <span className="flex items-center space-x-1">
                                    <SlackIcon className="h-4 w-4" />
                                    <span>
                                      {member.slack?.[0] === "@"
                                        ? member.slack.slice(1)
                                        : member.slack}
                                    </span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Wallet address */}
                            {(member.publicAddress || member.walletAddress) && (
                              <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                                <span className="mr-1">Wallet:</span>
                                <button
                                  onClick={() =>
                                    handleCopyAddress(
                                      (member.publicAddress || member.walletAddress) as string
                                    )
                                  }
                                  className="flex items-center space-x-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors group"
                                  title="Click to copy wallet address"
                                >
                                  <span>
                                    {getMemberDisplayValue(
                                      member,
                                      member.publicAddress ? "publicAddress" : "walletAddress"
                                    )}
                                  </span>
                                  {copiedAddress ===
                                  (member.publicAddress || member.walletAddress) ? (
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
                    {canManage && !isEditing && (
                      <div className="flex items-center space-x-1 ml-4">
                        {((onEditRoles && roleOptions) || onEditContact) && (
                          <button
                            onClick={() => handleStartEdit(member.id)}
                            aria-label={`Edit ${member.name || member.id}`}
                            className={cn(
                              "p-2 rounded-md",
                              "text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400",
                              "hover:bg-gray-100 dark:hover:bg-gray-800",
                              "transition-colors duration-200"
                            )}
                          >
                            <PencilIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveClick(member.id)}
                          disabled={removingMemberId === member.id}
                          aria-label={`Remove ${member.name || member.id}`}
                          className={cn(
                            "p-2 rounded-md",
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
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Remove confirmation dialog */}
      <DeleteDialog
        title={`Are you sure you want to remove ${
          membersRef.current.find((m) => m.id === removeDialogMemberId)?.name || "this member"
        }?`}
        deleteFunction={handleRemoveConfirm}
        isLoading={removingMemberId !== null}
        buttonElement={null}
        externalIsOpen={removeDialogMemberId !== null}
        externalSetIsOpen={(isOpen) => {
          if (!isOpen) setRemoveDialogMemberId(null);
        }}
      />

      {/* Empty roles confirmation dialog */}
      <DeleteDialog
        title={`No roles selected. This will remove ${
          membersRef.current.find((m) => m.id === editingMemberId)?.name || "this member"
        }. Continue?`}
        deleteFunction={handleEmptyRolesConfirm}
        isLoading={isSavingEdit}
        buttonElement={null}
        externalIsOpen={showEmptyRolesDialog}
        externalSetIsOpen={setShowEmptyRolesDialog}
      />
    </div>
  );
};
