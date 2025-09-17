"use client";

import React, { useState, useEffect, useRef } from "react";
import { FormField, FormSchema } from "@/types/question-builder";
import { fieldTypes, FieldTypeSelector } from "./FieldTypeSelector";
import { FieldEditor } from "./FieldEditor";
import { FormPreview } from "./FormPreview";
import { AIPromptConfiguration } from "./AIPromptConfiguration";
import { SettingsConfiguration } from "./SettingsConfiguration";
import { Button } from "@/components/Utilities/Button";
import {
  EyeIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { MarkdownPreview } from "../Utilities/MarkdownPreview";
import { MarkdownEditor } from "../Utilities/MarkdownEditor";

interface QuestionBuilderProps {
  initialSchema?: FormSchema;
  onSave?: (schema: FormSchema) => void;
  className?: string;
  programId?: string;
  chainId?: number;
  initialPostApprovalSchema?: FormSchema;
  onSavePostApproval?: (schema: FormSchema) => void;
}

export function QuestionBuilder({
  initialSchema,
  onSave,
  className = "",
  programId,
  chainId,
  initialPostApprovalSchema,
  onSavePostApproval,
}: QuestionBuilderProps) {
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
      },
    }
  );

  const [postApprovalSchema, setPostApprovalSchema] = useState<FormSchema>(
    initialPostApprovalSchema || {
      id: `post_approval_form_${Date.now()}`,
      title: "Post Approval Form", 
      description: "Please provide additional information for approved applications",
      fields: [],
      settings: {
        submitButtonText: "Submit Post Approval Information",
        confirmationMessage: "Thank you for providing the additional information!",
        privateApplications: true, // Post-approval forms are always private
      },
    }
  );

  const [activeTab, setActiveTab] = useState<"build" | "preview" | "settings" | "post-approval" | "ai-config">(
    "build"
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Helper to determine if we're working with post approval form
  const isPostApprovalMode = activeTab === "post-approval";
  const currentSchema = isPostApprovalMode ? postApprovalSchema : schema;
  const setCurrentSchema = isPostApprovalMode ? setPostApprovalSchema : setSchema;

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
          ? initialPostApprovalSchema.fields.map(field => ({ ...field, private: true })) // Ensure all fields are private
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
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: `New ${fieldType} field`,
      required: fieldType === "email" && !isPostApprovalMode ? true : false, // Email fields are required by default only in main form
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
    setCurrentSchema((prev) => ({
      ...prev,
      fields: (prev.fields || []).map((field) =>
        field.id === updatedField.id ? updatedField : field
      ),
    }));
  };

  const handleFieldDelete = (fieldId: string) => {
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
    if (!currentSchema.fields) return;

    const currentIndex = currentSchema.fields.findIndex(
      (field) => field.id === fieldId
    );
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

  const handleTitleChange = (title: string) => {
    setCurrentSchema((prev) => ({ ...prev, title }));
  };

  const handleDescriptionChange = (description: string) => {
    setCurrentSchema((prev) => ({ ...prev, description }));
  };

  const hasEmailField = () => {
    if (!currentSchema.fields) return false;
    return currentSchema.fields.some(
      (field) =>
        field.type === "email" || field.label.toLowerCase().includes("email")
    );
  };

  const needsEmailValidation = () => {
    // Only require email field for main application form, not for post approval
    return !isPostApprovalMode && !hasEmailField();
  };

  const handleSave = () => {
    if (isPostApprovalMode) {
      // For post approval forms, email field is not required
      onSavePostApproval?.(postApprovalSchema);
    } else {
      if (needsEmailValidation()) {
        alert(
          "Please add at least one email field to the form. This is required for application tracking."
        );
        return;
      }
      onSave?.(schema);
    }
  };

  const handleFormSubmit = (data: Record<string, any>) => {
    alert(currentSchema.settings.confirmationMessage);
  };

  const handleAIConfigUpdate = (updatedSchema: FormSchema) => {
    if (isPostApprovalMode) {
      setPostApprovalSchema(updatedSchema);
    } else {
      setSchema(updatedSchema);
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}
    >
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sm:px-3 md:px-4 px-6 py-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between flex-wrap gap-4">
          <div className="flex flex-col gap-2 mb-4 sm:mb-0">
            <input
              type="text"
              value={currentSchema.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-xl font-bold bg-transparent border-none outline-none bg-zinc-100 dark:bg-zinc-800 rounded-md text-gray-900 dark:text-white placeholder-gray-400"
              placeholder="Form Title"
            />
            <MarkdownEditor
              value={currentSchema.description || ""}
              onChange={(value: string) => handleDescriptionChange(value)}
              className="mt-1 text-sm bg-transparent border-none outline-none bg-zinc-100 dark:bg-zinc-800 rounded-md text-gray-600 dark:text-gray-400 placeholder-gray-500"
              placeholderText="Form Description"
              height={100}
              minHeight={100}
            />
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("build")}
                className={`flex items-center px-3 py-1 text-sm font-medium rounded-lg transition-colors ${activeTab === "build"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
                Build
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center px-3 py-1 text-sm font-medium rounded-lg transition-colors ${activeTab === "settings"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <Cog6ToothIcon className="w-4 h-4 mr-2" />
                Settings
              </button>
              <button
                onClick={() => setActiveTab("post-approval")}
                className={`flex items-center px-3 py-1 text-sm font-medium rounded-lg transition-colors ${activeTab === "post-approval"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Post Approval
              </button>
              {!isPostApprovalMode && (
                <button
                  onClick={() => setActiveTab("ai-config")}
                  className={`flex items-center px-3 py-1 text-sm font-medium rounded-lg transition-colors ${activeTab === "ai-config"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    }`}
                >
                  <CpuChipIcon className="w-4 h-4 mr-2" />
                  AI Config
                </button>
              )}
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center px-3 py-1 text-sm font-medium rounded-lg transition-colors ${activeTab === "preview"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                Preview
              </button>
            </div>

            <Button
              onClick={handleSave}
              className={`py-2 ${needsEmailValidation()
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-blue-600 hover:bg-blue-700"
                }`}
              title={
                needsEmailValidation()
                  ? "Add an email field before saving"
                  : undefined
              }
            >
              {needsEmailValidation() && (
                <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
              )}
              {isPostApprovalMode ? "Save Post Approval Form" : "Save Form"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden  sm:px-3 md:px-4 px-6 py-2">
        {activeTab === "build" || activeTab === "post-approval" ? (
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Field Types Panel */}
            <div className="lg:col-span-1">
              <FieldTypeSelector onFieldAdd={handleFieldAdd} isPostApprovalMode={isPostApprovalMode} />
            </div>

            {/* Form Builder */}
            <div className="lg:col-span-2 overflow-y-auto">
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
                        Use it to collect additional information needed for the next steps. All fields are automatically set as private, and email fields are not required since we already have the applicant's information.
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
                      Add form fields from the panel on the left to start
                      building your form.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Form Fields List */}
                    <div className="space-y-3">
                      {currentSchema.fields.map((field, index) => (
                        <div
                          key={field.id}
                          ref={(el) => {
                            fieldRefs.current[field.id] = el;
                          }}
                          className={`border rounded-lg transition-all ${selectedFieldId === field.id
                            ? "border-blue-500 bg-white dark:bg-gray-800 shadow-lg"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                        >
                          <div
                            className="p-4 cursor-pointer"
                            onClick={() =>
                              setSelectedFieldId(
                                selectedFieldId === field.id ? null : field.id
                              )
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                    {fieldTypes.find(
                                      (item) => item.type === field.type
                                    )?.label || field.type}
                                  </span>
                                  {field.required && (
                                    <span className="text-xs text-red-500">
                                      Required
                                    </span>
                                  )}
                                  {field.private && (
                                    <span className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded flex items-center space-x-1">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                      </svg>
                                      <span>Private</span>
                                    </span>
                                  )}

                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white mt-1">
                                  {field.label}
                                </h4>
                                {field.description && (
                                  <MarkdownPreview
                                    className="text-sm text-gray-500 dark:text-gray-400 mt-1"
                                    components={{
                                      p: ({ children }) => <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">{children}</span>,
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
                          </div>

                          {/* Field Editor - appears inside the same block when expanded */}
                          {selectedFieldId === field.id && (
                            <div className="border-t border-gray-200 dark:border-gray-700">
                              <FieldEditor
                                key={selectedFieldId}
                                field={field}
                                onUpdate={handleFieldUpdate}
                                onDelete={handleFieldDelete}
                                onMoveUp={
                                  index === 0
                                    ? undefined
                                    : () => handleFieldMove(field.id, "up")
                                }
                                onMoveDown={
                                  index === currentSchema.fields.length - 1
                                    ? undefined
                                    : () => handleFieldMove(field.id, "down")
                                }
                                isPostApprovalMode={isPostApprovalMode}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === "settings" ? (
          <div className="h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <SettingsConfiguration
                schema={currentSchema}
                onUpdate={handleAIConfigUpdate}
                programId={programId}
              />
            </div>
          </div>
        ) : activeTab === "ai-config" ? (
          <div className="h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <AIPromptConfiguration
                schema={currentSchema}
                onUpdate={handleAIConfigUpdate}
                programId={programId}
                chainId={chainId}
              />
            </div>
          </div>
        ) : (
          <div className="h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <FormPreview schema={currentSchema} onSubmit={handleFormSubmit} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
