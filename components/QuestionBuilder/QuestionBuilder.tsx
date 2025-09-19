"use client";

import React, { useState, useEffect, useRef } from "react";
import { FormField, FormSchema } from "@/types/question-builder";
import { fieldTypes, FieldTypeSelector } from "./FieldTypeSelector";
import { FieldEditor } from "./FieldEditor";
import { FormPreview } from "./FormPreview";
import { AIPromptConfiguration } from "./AIPromptConfiguration";
import { SettingsConfiguration } from "./SettingsConfiguration";
import { ReviewerManagementTab } from "@/components/FundingPlatform/QuestionBuilder/ReviewerManagementTab";
import { Button } from "@/components/Utilities/Button";
import {
  EyeIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import { MarkdownPreview } from "../Utilities/MarkdownPreview";
import { MarkdownEditor } from "../Utilities/MarkdownEditor";

interface QuestionBuilderProps {
  initialSchema?: FormSchema;
  onSave?: (schema: FormSchema) => void;
  className?: string;
  programId?: string;
  chainId?: number;
  communityId?: string;
  readOnly?: boolean;
}

export function QuestionBuilder({
  initialSchema,
  onSave,
  className = "",
  programId,
  chainId,
  communityId,
  readOnly = false,
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

  const [activeTab, setActiveTab] = useState<"build" | "preview" | "settings" | "ai-config" | "reviewers">(
    "build"
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Update schema when initialSchema changes (e.g., after loading from API)
  useEffect(() => {
    if (initialSchema) {
      setSchema({
        ...initialSchema,
        fields: Array.isArray(initialSchema.fields) ? initialSchema.fields : [],
      });
    }
  }, [initialSchema]);

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
      required: fieldType === "email" ? true : false, // Email fields are required by default
      options: ["select", "radio", "checkbox"].includes(fieldType)
        ? ["Option 1", "Option 2"]
        : undefined,
    };

    setSchema((prev) => ({
      ...prev,
      fields: [...(prev.fields || []), newField],
    }));

    setSelectedFieldId(newField.id);
  };

  const handleFieldUpdate = (updatedField: FormField) => {
    if (readOnly) return; // Prevent updating fields in read-only mode

    setSchema((prev) => ({
      ...prev,
      fields: (prev.fields || []).map((field) =>
        field.id === updatedField.id ? updatedField : field
      ),
    }));
  };

  const handleFieldDelete = (fieldId: string) => {
    if (readOnly) return; // Prevent deleting fields in read-only mode

    setSchema((prev) => ({
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
    if (!schema.fields) return;

    const currentIndex = schema.fields.findIndex(
      (field) => field.id === fieldId
    );
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= schema.fields.length) return;

    const newFields = [...schema.fields];
    const [movedField] = newFields.splice(currentIndex, 1);
    newFields.splice(newIndex, 0, movedField);

    setSchema((prev) => ({
      ...prev,
      fields: newFields,
    }));
  };

  const handleTitleChange = (title: string) => {
    setSchema((prev) => ({ ...prev, title }));
  };

  const handleDescriptionChange = (description: string) => {
    setSchema((prev) => ({ ...prev, description }));
  };

  const hasEmailField = () => {
    if (!schema.fields) return false;
    return schema.fields.some(
      (field) =>
        field.type === "email" || field.label.toLowerCase().includes("email")
    );
  };

  const handleSave = () => {
    if (!hasEmailField()) {
      alert(
        "Please add at least one email field to the form. This is required for application tracking."
      );
      return;
    }
    onSave?.(schema);
  };

  const handleFormSubmit = (data: Record<string, any>) => {
    alert(schema.settings.confirmationMessage);
  };

  const handleAIConfigUpdate = (updatedSchema: FormSchema) => {
    setSchema(updatedSchema);
  };

  return (
    <div
      className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}
    >
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sm:px-3 md:px-4 px-6 py-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between flex-wrap gap-4">
          <div className="flex flex-col gap-2 mb-4 sm:mb-0">
            {readOnly ? (
              <>
                <div className="text-xl font-bold text-gray-900 dark:text-white px-3 py-2">
                  {schema.title}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 px-3 py-1">
                  <MarkdownPreview source={schema.description || ""} />
                </div>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={schema.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-xl font-bold bg-transparent border-none outline-none bg-zinc-100 dark:bg-zinc-800 rounded-md text-gray-900 dark:text-white placeholder-gray-400"
                  placeholder="Form Title"
                />
                <MarkdownEditor
                  value={schema.description || ""}
                  onChange={(value: string) => handleDescriptionChange(value)}
                  className="mt-1 text-sm bg-transparent border-none outline-none bg-zinc-100 dark:bg-zinc-800 rounded-md text-gray-600 dark:text-gray-400 placeholder-gray-500"
                  placeholderText="Form Description"
                  height={100}
                  minHeight={100}
                />
              </>
            )}
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
                onClick={() => setActiveTab("ai-config")}
                className={`flex items-center px-3 py-1 text-sm font-medium rounded-lg transition-colors ${activeTab === "ai-config"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <CpuChipIcon className="w-4 h-4 mr-2" />
                AI Config
              </button>
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
              <button
                onClick={() => setActiveTab("reviewers")}
                className={`flex items-center px-3 py-1 text-sm font-medium rounded-lg transition-colors ${activeTab === "reviewers"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <UserGroupIcon className="w-4 h-4 mr-2" />
                Reviewers
              </button>
            </div>

            {!readOnly && (
              <Button
                onClick={handleSave}
                className={`py-2 ${!hasEmailField()
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-blue-600 hover:bg-blue-700"
                  }`}
                title={
                  !hasEmailField()
                    ? "Add an email field before saving"
                    : undefined
                }
              >
                {!hasEmailField() && (
                  <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                )}
                Save Form
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden  sm:px-3 md:px-4 px-6 py-2">
        {activeTab === "build" ? (
          <div className={`h-full grid grid-cols-1 ${readOnly ? '' : 'lg:grid-cols-3'} gap-6`}>
            {/* Field Types Panel - Hidden in read-only mode */}
            {!readOnly && (
              <div className="lg:col-span-1">
                <FieldTypeSelector onFieldAdd={handleFieldAdd} />
              </div>
            )}

            {/* Form Builder */}
            <div className={readOnly ? '' : 'lg:col-span-2 overflow-y-auto'}>
              <div className="space-y-4">
                {/* Email Field Warning */}
                {!hasEmailField() && (
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

                {!schema.fields || schema.fields.length === 0 ? (
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
                      {schema.fields.map((field, index) => (
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
                                readOnly={readOnly}
                                onMoveUp={
                                  index === 0
                                    ? undefined
                                    : () => handleFieldMove(field.id, "up")
                                }
                                onMoveDown={
                                  index === schema.fields.length - 1
                                    ? undefined
                                    : () => handleFieldMove(field.id, "down")
                                }
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
                schema={schema}
                onUpdate={readOnly ? undefined : handleAIConfigUpdate}
                programId={programId}
                readOnly={readOnly}
              />
            </div>
          </div>
        ) : activeTab === "ai-config" ? (
          <div className="h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <AIPromptConfiguration
                schema={schema}
                onUpdate={readOnly ? undefined : handleAIConfigUpdate}
                programId={programId}
                chainId={chainId}
                readOnly={readOnly}
              />
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
        ) : (
          <div className="h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <FormPreview schema={schema} onSubmit={handleFormSubmit} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
