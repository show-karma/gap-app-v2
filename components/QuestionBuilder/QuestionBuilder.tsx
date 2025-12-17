"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import {
  Bars3Icon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ProgramDetailsTab } from "@/components/FundingPlatform/QuestionBuilder/ProgramDetailsTab";
import { ReviewerManagementTab } from "@/components/FundingPlatform/QuestionBuilder/ReviewerManagementTab";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import type { FormField, FormSchema } from "@/types/question-builder";
import { MarkdownEditor } from "../Utilities/MarkdownEditor";
import { MarkdownPreview } from "../Utilities/MarkdownPreview";
import { AIPromptConfiguration } from "./AIPromptConfiguration";
import { FieldEditor } from "./FieldEditor";
import { FieldTypeSelector, fieldTypes } from "./FieldTypeSelector";
import { SettingsConfiguration } from "./SettingsConfiguration";

const TAB_KEYS = [
  "build",
  "settings",
  "post-approval",
  "ai-config",
  "reviewers",
  "program-details",
] as const;
type TabKey = (typeof TAB_KEYS)[number];
const DEFAULT_TAB: TabKey = "build";

const isTabKey = (value: string | null): value is TabKey =>
  !!value && TAB_KEYS.includes(value as TabKey);

const getValidTab = (value: string | null): TabKey => (isTabKey(value) ? value : DEFAULT_TAB);

// Tab configuration for rendering buttons
const TAB_CONFIG = [
  { key: "build" as TabKey, icon: WrenchScrewdriverIcon, label: "Build" },
  { key: "settings" as TabKey, icon: Cog6ToothIcon, label: "Settings" },
  {
    key: "post-approval" as TabKey,
    icon: CheckCircleIcon,
    label: "Post Approval",
  },
  { key: "ai-config" as TabKey, icon: CpuChipIcon, label: "AI Config" },
  { key: "reviewers" as TabKey, icon: UserGroupIcon, label: "Reviewers" },
  { key: "program-details" as TabKey, icon: DocumentTextIcon, label: "Program Details" },
] as const;

// Helper to get tab button class names
const getTabButtonClassName = (isActive: boolean): string => {
  const base = "flex items-center px-3 py-1 text-sm font-medium rounded-lg transition-colors";
  return isActive
    ? `${base} bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm`
    : `${base} text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white`;
};

interface QuestionBuilderProps {
  initialSchema?: FormSchema;
  onSave?: (schema: FormSchema) => void;
  className?: string;
  programId: string;
  chainId?: number; // Optional - V2 endpoints use programId only
  communityId: string;
  readOnly?: boolean;
  initialPostApprovalSchema?: FormSchema;
  onSavePostApproval?: (schema: FormSchema) => void;
}

export function QuestionBuilder({
  initialSchema,
  onSave,
  className = "",
  programId,
  chainId,
  communityId,
  readOnly = false,
  initialPostApprovalSchema,
  onSavePostApproval,
}: QuestionBuilderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [schema, setSchema] = useState<FormSchema>(
    initialSchema || {
      id: `form_${Date.now()}`,
      title: "New Application Form",
      description: "Please fill out this application form",
      fields: [],
      settings: {
        submitButtonText: "Submit Application",
        confirmationMessage: "Thank you for your submission!",
        privateApplications: true, // Default to private as requested
        successPageContent: "", // Empty by default to encourage configuration
      },
    }
  );

  const [postApprovalSchema, setPostApprovalSchema] = useState<FormSchema>(
    initialPostApprovalSchema || {
      id: `post_approval_form_${Date.now()}`,
      title: "Post Approval Form",
      description: "", // Keep description empty to avoid duplication in UI
      fields: [],
      settings: {
        submitButtonText: "Submit Post Approval Information",
        confirmationMessage: "Thank you for providing the additional information!",
        privateApplications: true, // Post-approval forms are always private
      },
    }
  );

  const [activeTab, setActiveTab] = useState<TabKey>(() => getValidTab(searchParams.get("tab")));
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [newEmail, setNewEmail] = useState<string>("");

  // Helper to determine if we're working with post approval form
  const isPostApprovalMode = activeTab === "post-approval";
  const currentSchema = isPostApprovalMode ? postApprovalSchema : schema;
  const setCurrentSchema = isPostApprovalMode ? setPostApprovalSchema : setSchema;

  // Sync URL tab parameter with local state and clean up invalid tabs
  useEffect(() => {
    try {
      const tabParam = searchParams.get("tab");
      const nextTab = getValidTab(tabParam);

      // Update active tab state if needed
      setActiveTab((prev) => (prev === nextTab ? prev : nextTab));

      // Clean up invalid tab parameters from URL
      if (tabParam && !isTabKey(tabParam)) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("tab");
        const url = params.toString() ? `${pathname}?${params}` : pathname;
        router.replace(url);
      }
    } catch (error) {
      errorManager("Failed to synchronize tab state with URL", error, {
        pathname,
      });
      // Fallback to default tab on error
      setActiveTab(DEFAULT_TAB);
    }
  }, [pathname, router, searchParams]);

  const updateTabInUrl = (tab: TabKey) => {
    try {
      const params = new URLSearchParams(searchParams.toString());

      if (tab === DEFAULT_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }

      const url = params.toString() ? `${pathname}?${params}` : pathname;
      router.replace(url);
    } catch (error) {
      errorManager(`Failed to update URL for tab: ${tab}`, error, {
        tab,
        pathname,
      });
      toast.error("Navigation updated locally. The URL may not reflect your current view.");
    }
  };

  const handleTabChange = (tab: TabKey) => {
    if (tab === activeTab) return;

    // Update state first (immediate UI feedback)
    setActiveTab(tab);

    // Only update URL if it needs to change
    const currentTabParam = searchParams.get("tab");
    const needsUrlUpdate =
      (tab !== DEFAULT_TAB || currentTabParam !== null) && currentTabParam !== tab;

    if (needsUrlUpdate) {
      updateTabInUrl(tab);
    }
  };

  // Update schema when initialSchema changes (e.g., after loading from API)
  useEffect(() => {
    if (initialSchema) {
      setSchema({
        ...initialSchema,
        fields: Array.isArray(initialSchema.fields) ? initialSchema.fields : [],
      });
    }
  }, [initialSchema]);

  // Update post approval schema when initialPostApprovalSchema changes
  useEffect(() => {
    if (initialPostApprovalSchema) {
      setPostApprovalSchema({
        ...initialPostApprovalSchema,
        fields: Array.isArray(initialPostApprovalSchema.fields)
          ? initialPostApprovalSchema.fields.map((field) => ({
              ...field,
              private: true,
            })) // Ensure all fields are private
          : [],
        settings: {
          ...initialPostApprovalSchema.settings,
          privateApplications: true, // Ensure post-approval forms are always private
        },
      });
    }
  }, [initialPostApprovalSchema]);

  // Scroll to the selected field editor when it opens
  useEffect(() => {
    if (selectedFieldId && fieldRefs.current[selectedFieldId]) {
      setTimeout(() => {
        fieldRefs.current[selectedFieldId]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }
  }, [selectedFieldId]);

  const handleFieldAdd = (fieldType: FormField["type"]) => {
    if (readOnly) return; // Prevent adding fields in read-only mode

    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: `New ${fieldType} field`,
      required: !!(fieldType === "email" && !isPostApprovalMode), // Email fields are required by default only in main form
      private: isPostApprovalMode, // All fields in post-approval mode are private by default
      options: ["select", "radio", "checkbox"].includes(fieldType)
        ? ["Option 1", "Option 2"]
        : undefined,
    };

    setCurrentSchema((prev) => ({
      ...prev,
      fields: [...(prev.fields || []), newField],
    }));

    setSelectedFieldId(newField.id);
  };

  const handleFieldUpdate = (updatedField: FormField) => {
    if (readOnly) return; // Prevent updating fields in read-only mode

    setCurrentSchema((prev) => ({
      ...prev,
      fields: (prev.fields || []).map((field) =>
        field.id === updatedField.id ? updatedField : field
      ),
    }));
  };

  const handleFieldDelete = (fieldId: string) => {
    if (readOnly) return; // Prevent deleting fields in read-only mode

    setCurrentSchema((prev) => ({
      ...prev,
      fields: (prev.fields || []).filter((field) => field.id !== fieldId),
    }));

    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }

    // Clean up the ref
    delete fieldRefs.current[fieldId];
  };

  const handleFieldMove = (fieldId: string, direction: "up" | "down") => {
    if (readOnly) return; // Prevent moving fields in read-only mode
    if (!currentSchema.fields) return;

    const currentIndex = currentSchema.fields.findIndex((field) => field.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= currentSchema.fields.length) return;

    const newFields = [...currentSchema.fields];
    const [movedField] = newFields.splice(currentIndex, 1);
    newFields.splice(newIndex, 0, movedField);

    setCurrentSchema((prev) => ({
      ...prev,
      fields: newFields,
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    try {
      const { active, over } = event;

      if (!over || active.id === over.id || readOnly) return;

      const oldIndex = currentSchema.fields.findIndex((field) => field.id === active.id);
      const newIndex = currentSchema.fields.findIndex((field) => field.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newFields = arrayMove(currentSchema.fields, oldIndex, newIndex);
        setCurrentSchema((prev) => ({
          ...prev,
          fields: newFields,
        }));
      }
    } catch (error) {
      errorManager("Failed to reorder form fields", error, {
        activeId: event.active.id,
        overId: event.over?.id,
      });
      toast.error("Failed to reorder fields. Please try again.");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleTitleChange = (title: string) => {
    setCurrentSchema((prev) => ({ ...prev, title }));
  };

  const handleDescriptionChange = (description: string) => {
    setCurrentSchema((prev) => ({ ...prev, description }));
  };

  const hasEmailField = () => {
    if (!currentSchema.fields) return false;
    return currentSchema.fields.some(
      (field) => field.type === "email" || field.label.toLowerCase().includes("email")
    );
  };

  const needsEmailValidation = () => {
    // Only require email field for main application form, not for post approval
    return !isPostApprovalMode && !hasEmailField();
  };

  const handleSave = async () => {
    try {
      if (isPostApprovalMode) {
        // For post approval forms, email field is not required
        await onSavePostApproval?.(postApprovalSchema);
        toast.success("Post approval form saved successfully!");
      } else {
        if (needsEmailValidation()) {
          toast.error(
            "Please add at least one email field to the form. This is required for application tracking."
          );
          return;
        }
        await onSave?.(schema);
      }
    } catch (error) {
      errorManager("Failed to save form schema", error, {
        isPostApprovalMode,
        formId: isPostApprovalMode ? postApprovalSchema.id : schema.id,
        fieldsCount: isPostApprovalMode ? postApprovalSchema.fields.length : schema.fields.length,
      });
      toast.error("Failed to save form. Please try again.");
    }
  };

  const handleAIConfigUpdate = (updatedSchema: FormSchema) => {
    if (isPostApprovalMode) {
      setPostApprovalSchema(updatedSchema);
    } else {
      setSchema(updatedSchema);
    }
  };

  const handleAddEmail = () => {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const trimmedEmail = newEmail.trim();

      if (!trimmedEmail) {
        toast.error("Please enter an email address.");
        return;
      }

      if (!emailRegex.test(trimmedEmail)) {
        toast.error("Please enter a valid email address.");
        return;
      }

      const currentEmails = currentSchema.emailNotifications || [];

      if (currentEmails.includes(trimmedEmail)) {
        toast.error("This email is already in the list.");
        return;
      }

      setCurrentSchema((prev) => ({
        ...prev,
        emailNotifications: [...currentEmails, trimmedEmail],
      }));
      setNewEmail("");
      toast.success("Email added successfully!");
    } catch (error) {
      errorManager("Failed to add email", error, { email: newEmail });
      toast.error("Failed to add email. Please try again.");
    }
  };

  const handleRemoveEmail = (index: number) => {
    try {
      setCurrentSchema((prev) => ({
        ...prev,
        emailNotifications:
          prev.emailNotifications?.filter((_email: string, i: number) => i !== index) || [],
      }));
      toast.success("Email removed successfully!");
    } catch (error) {
      errorManager("Failed to remove email", error, { index });
      toast.error("Failed to remove email. Please try again.");
    }
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const renderSaveButton = () => {
    if (readOnly) return null;
    return (
      <div className="flex justify-end pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          onClick={handleSave}
          className={`py-2 ${
            needsEmailValidation()
              ? "bg-yellow-600 hover:bg-yellow-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          title={needsEmailValidation() ? "Add an email field before saving" : undefined}
        >
          {needsEmailValidation() && <ExclamationTriangleIcon className="w-4 h-4 mr-2" />}
          {isPostApprovalMode ? "Save Post Approval Form" : "Save Form"}
        </Button>
      </div>
    );
  };

  const renderFormTitleDescription = () => {
    if (readOnly) {
      return (
        <div className="mb-6 p-1">
          <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {currentSchema.title}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <MarkdownPreview source={currentSchema.description || ""} />
          </div>
        </div>
      );
    }
    return (
      <div className="mb-6 p-1 space-y-3">
        <input
          type="text"
          value={currentSchema.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="text-xl font-bold bg-transparent border-none outline-none bg-zinc-100 dark:bg-zinc-800 rounded-md text-gray-900 dark:text-white placeholder-gray-400 w-full px-3 py-2"
          placeholder="Form Title"
        />
        <MarkdownEditor
          value={currentSchema.description || ""}
          onChange={(value?: string) => handleDescriptionChange(value ?? "")}
          className="text-sm bg-transparent border-none outline-none bg-zinc-100 dark:bg-zinc-800 rounded-md text-gray-600 dark:text-gray-400 placeholder-gray-500"
          placeholderText="Form Description"
          height={100}
          minHeight={100}
        />
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${className}`.trim()}>
      {/* Header - Tabs only */}
      <div className="border-b border-gray-200 dark:border-gray-700 sm:px-3 md:px-4 px-6 py-2">
        <div className="flex flex-row flex-wrap bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-fit">
          {TAB_CONFIG.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={getTabButtonClassName(activeTab === key)}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden sm:px-3 md:px-4 px-6 py-4">
        {activeTab === "build" || activeTab === "post-approval" ? (
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Field Types Panel */}
            {!readOnly && (
              <div className="lg:col-span-1">
                <FieldTypeSelector
                  onFieldAdd={handleFieldAdd}
                  isPostApprovalMode={isPostApprovalMode}
                />
              </div>
            )}

            {/* Form Builder */}
            <div className={readOnly ? "" : "lg:col-span-2 overflow-y-auto"}>
              {/* Form Title and Description - Only in Build/Post-Approval tabs */}
              {renderFormTitleDescription()}

              <div className="space-y-4">
                {/* Email Field Warning - only for main application form */}
                {needsEmailValidation() && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start space-x-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Email Field Required
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        {`Your form must include at least one email field for
                        application tracking. Add a field with type "Email" or
                        label containing "email".`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Post Approval Form Info */}
                {isPostApprovalMode && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start space-x-3">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Post Approval Form
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        This form will be shown to applicants after their application is approved.
                        {`Use it to collect additional information needed for the next steps. All fields are automatically set as private, and email fields are not required since we already have the applicant's information.`}
                      </p>
                    </div>
                  </div>
                )}

                {!currentSchema.fields || currentSchema.fields.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <Cog6ToothIcon className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No fields yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Add form fields from the panel on the left to start building your form.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Form Fields List with Drag and Drop */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={currentSchema.fields.map((field) => field.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {currentSchema.fields.map((field, index) => (
                            <SortableFieldItem
                              key={field.id}
                              field={field}
                              index={index}
                              selectedFieldId={selectedFieldId}
                              setSelectedFieldId={setSelectedFieldId}
                              handleFieldUpdate={handleFieldUpdate}
                              handleFieldDelete={handleFieldDelete}
                              handleFieldMove={handleFieldMove}
                              readOnly={readOnly}
                              isPostApprovalMode={isPostApprovalMode}
                              totalFields={currentSchema.fields.length}
                              fieldRefs={fieldRefs}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </>
                )}

                {/* Post Approval Email Notification Section - Only show in post-approval mode */}
                {isPostApprovalMode && (
                  <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          Post Approval Email Notifications
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Add email addresses that should receive notifications when post-approval
                          forms are submitted.
                        </p>
                      </div>
                    </div>

                    {/* Email List */}
                    {currentSchema.emailNotifications &&
                      currentSchema.emailNotifications.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {currentSchema.emailNotifications.map((email, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {email}
                                </span>
                              </div>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEmail(index)}
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                                  aria-label={`Remove ${email}`}
                                >
                                  <XMarkIcon className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Empty state */}
                    {(!currentSchema.emailNotifications ||
                      currentSchema.emailNotifications.length === 0) && (
                      <div className="text-center py-8 mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          No email addresses added yet
                        </p>
                      </div>
                    )}

                    {/* Add Email Input */}
                    {!readOnly && (
                      <div className="space-y-2">
                        <label
                          htmlFor="email-input"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Add Email Address
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="email-input"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            onKeyDown={handleEmailKeyDown}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                            placeholder="Enter email address (e.g., admin@example.com)"
                          />
                          <Button
                            type="button"
                            onClick={handleAddEmail}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            <PlusIcon className="w-5 h-5" />
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Press Enter or click Add to include the email address
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Save Button at bottom of Build/Post-Approval tab */}
                {renderSaveButton()}
              </div>
            </div>
          </div>
        ) : activeTab === "settings" ? (
          <div className="h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <SettingsConfiguration
                onUpdate={readOnly ? undefined : handleAIConfigUpdate}
                schema={currentSchema}
                programId={programId}
                readOnly={readOnly}
              />
              {/* Save Button at bottom of Settings tab */}
              {renderSaveButton()}
            </div>
          </div>
        ) : activeTab === "ai-config" ? (
          <div className="h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <AIPromptConfiguration
                onUpdate={readOnly ? undefined : handleAIConfigUpdate}
                schema={currentSchema}
                programId={programId}
                chainId={chainId}
                readOnly={readOnly}
              />
              {/* Save Button at bottom of AI Config tab */}
              {renderSaveButton()}
            </div>
          </div>
        ) : activeTab === "reviewers" ? (
          <div className="h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              {programId && chainId && communityId ? (
                <ReviewerManagementTab
                  programId={programId}
                  chainID={chainId}
                  communityId={communityId}
                  readOnly={readOnly}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    Program information is required to manage reviewers.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "program-details" ? (
          <ProgramDetailsTab programId={programId} chainId={chainId} readOnly={readOnly} />
        ) : null}
      </div>
    </div>
  );
}

interface SortableFieldItemProps {
  field: FormField;
  index: number;
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  handleFieldUpdate: (field: FormField) => void;
  handleFieldDelete: (fieldId: string) => void;
  handleFieldMove: (fieldId: string, direction: "up" | "down") => void;
  readOnly: boolean;
  isPostApprovalMode: boolean;
  totalFields: number;
  fieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
}

function SortableFieldItem({
  field,
  index,
  selectedFieldId,
  setSelectedFieldId,
  handleFieldUpdate,
  handleFieldDelete,
  handleFieldMove,
  readOnly,
  isPostApprovalMode,
  totalFields,
  fieldRefs,
}: SortableFieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        fieldRefs.current[field.id] = el;
      }}
      style={style}
      className={`border rounded-lg transition-all ${
        selectedFieldId === field.id
          ? "border-blue-500 bg-white dark:bg-gray-800 shadow-lg"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
      } ${isDragging ? "z-50" : ""}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Drag Handle */}
          {!readOnly && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2 -ml-2 mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Drag to reorder"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            className="flex-1 cursor-pointer bg-transparent border-none text-left w-full"
            onClick={() => setSelectedFieldId(selectedFieldId === field.id ? null : field.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                    {fieldTypes.find((item) => item.type === field.type)?.label || field.type}
                  </span>
                  {field.required && <span className="text-xs text-red-500">Required</span>}
                  {field.private && (
                    <span className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Private</span>
                    </span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mt-1">{field.label}</h4>
                {field.description && (
                  <MarkdownPreview
                    className="text-sm text-gray-500 dark:text-gray-400 mt-1"
                    components={{
                      p: ({ children }) => (
                        <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {children}
                        </span>
                      ),
                    }}
                    source={field.description}
                  />
                )}
              </div>
              <div className="ml-4">
                {selectedFieldId === field.id ? (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Field Editor - appears inside the same block when expanded */}
        {selectedFieldId === field.id && (
          <div className="border-t border-gray-200 dark:border-gray-700 mt-4">
            <FieldEditor
              key={selectedFieldId}
              field={field}
              onUpdate={handleFieldUpdate}
              onDelete={handleFieldDelete}
              readOnly={readOnly}
              onMoveUp={
                index === 0 ? undefined : (fieldId: string) => handleFieldMove(fieldId, "up")
              }
              onMoveDown={
                index === totalFields - 1
                  ? undefined
                  : (fieldId: string) => handleFieldMove(fieldId, "down")
              }
              isPostApprovalMode={isPostApprovalMode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
