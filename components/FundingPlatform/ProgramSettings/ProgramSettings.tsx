"use client";

import {
  CheckCircleIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  EyeSlashIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { errorManager } from "@/components/Utilities/errorManager";
import { Spinner } from "@/components/Utilities/Spinner";
import type { FormSchema } from "@/types/question-builder";
import { CollapsibleSection, type ConfigurationStatus } from "./CollapsibleSection";
import { ProgramDetailsSection } from "./sections/ProgramDetailsSection";
import { ApplicationFormSection } from "./sections/ApplicationFormSection";
import { ReviewEvaluationSection } from "./sections/ReviewEvaluationSection";
import { PostApprovalSection } from "./sections/PostApprovalSection";
import { CommunicationSection } from "./sections/CommunicationSection";
import { PrivacySection } from "./sections/PrivacySection";

interface ProgramSettingsProps {
  programId: string;
  chainId?: number;
  communityId: string;
  readOnly?: boolean;
  initialSchema?: FormSchema;
  initialPostApprovalSchema?: FormSchema;
  onSaveSchema?: (schema: FormSchema) => Promise<void>;
  onSavePostApprovalSchema?: (schema: FormSchema) => Promise<void>;
}

export function ProgramSettings({
  programId,
  chainId,
  communityId,
  readOnly = false,
  initialSchema,
  initialPostApprovalSchema,
  onSaveSchema,
  onSavePostApprovalSchema,
}: ProgramSettingsProps) {
  // Form schema state
  const [schema, setSchema] = useState<FormSchema>(
    initialSchema || {
      id: `form_${Date.now()}`,
      title: "New Application Form",
      description: "Please fill out this application form",
      fields: [],
      settings: {
        submitButtonText: "Submit Application",
        confirmationMessage: "Thank you for your submission!",
        privateApplications: true,
        successPageContent: "",
      },
    }
  );

  const [postApprovalSchema, setPostApprovalSchema] = useState<FormSchema>(
    initialPostApprovalSchema || {
      id: `post_approval_form_${Date.now()}`,
      title: "Post Approval Form",
      description: "",
      fields: [],
      settings: {
        submitButtonText: "Submit Post Approval Information",
        confirmationMessage: "Thank you for providing the additional information!",
        privateApplications: true,
      },
    }
  );

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update schemas when initial values change
  useEffect(() => {
    if (initialSchema) {
      setSchema({
        ...initialSchema,
        fields: Array.isArray(initialSchema.fields) ? initialSchema.fields : [],
      });
    }
  }, [initialSchema]);

  useEffect(() => {
    if (initialPostApprovalSchema) {
      setPostApprovalSchema({
        ...initialPostApprovalSchema,
        fields: Array.isArray(initialPostApprovalSchema.fields)
          ? initialPostApprovalSchema.fields.map((field) => ({ ...field, private: true }))
          : [],
        settings: {
          ...initialPostApprovalSchema.settings,
          privateApplications: true,
        },
      });
    }
  }, [initialPostApprovalSchema]);

  // Calculate configuration status for each section
  const sectionStatuses = useMemo(() => {
    const hasEmailField = schema.fields?.some(
      (field) => field.type === "email" || field.label.toLowerCase().includes("email")
    );

    // Check if AI config has any meaningful configuration
    const hasAiConfig = !!(
      schema.aiConfig?.systemPrompt ||
      schema.aiConfig?.detailedPrompt ||
      schema.aiConfig?.langfusePromptId
    );

    return {
      programDetails: "configured" as ConfigurationStatus, // Always shows as configured once program exists
      applicationForm: {
        status: (schema.fields?.length > 0
          ? hasEmailField
            ? "configured"
            : "partial"
          : "not-configured") as ConfigurationStatus,
        text:
          schema.fields?.length > 0
            ? `${schema.fields.length} field${schema.fields.length !== 1 ? "s" : ""}${!hasEmailField ? " (needs email)": ""}`
            : "No fields",
      },
      reviewEvaluation: {
        status: (hasAiConfig ? "configured" : "not-configured") as ConfigurationStatus,
        text: hasAiConfig ? "AI scoring enabled" : "Not configured",
      },
      postApproval: {
        status: (postApprovalSchema.fields?.length > 0
          ? "configured"
          : "not-configured") as ConfigurationStatus,
        text: postApprovalSchema.fields?.length
          ? `${postApprovalSchema.fields.length} field${postApprovalSchema.fields.length !== 1 ? "s" : ""}`
          : "Not configured",
      },
      communication: {
        status: (schema.settings?.successPageContent ||
        schema.settings?.approvalEmailTemplate ||
        schema.settings?.rejectionEmailTemplate
          ? "configured"
          : "not-configured") as ConfigurationStatus,
        text:
          schema.settings?.approvalEmailTemplate || schema.settings?.rejectionEmailTemplate
            ? "Email templates set"
            : "Not configured",
      },
      privacy: {
        status: "configured" as ConfigurationStatus,
        text: schema.settings?.privateApplications ? "Private" : "Public",
      },
    };
  }, [schema, postApprovalSchema]);

  // Handle schema updates
  const handleSchemaUpdate = useCallback((updatedSchema: FormSchema) => {
    setSchema(updatedSchema);
    setHasUnsavedChanges(true);
  }, []);

  const handlePostApprovalSchemaUpdate = useCallback((updatedSchema: FormSchema) => {
    setPostApprovalSchema({
      ...updatedSchema,
      settings: {
        ...updatedSchema.settings,
        privateApplications: true,
      },
    });
    setHasUnsavedChanges(true);
  }, []);

  // Validate before save
  const validateSchema = useCallback(() => {
    const hasEmailField = schema.fields?.some(
      (field) => field.type === "email" || field.label.toLowerCase().includes("email")
    );

    if (schema.fields?.length > 0 && !hasEmailField) {
      toast.error(
        "Please add at least one email field to the application form. This is required for applicant communication."
      );
      return false;
    }

    return true;
  }, [schema]);

  // Save all changes
  const handleSaveAll = async () => {
    if (readOnly) return;

    if (!validateSchema()) return;

    setIsSaving(true);
    try {
      // Save main form schema
      if (onSaveSchema) {
        await onSaveSchema(schema);
      }

      // Save post-approval schema if it has fields
      if (onSavePostApprovalSchema && postApprovalSchema.fields?.length > 0) {
        await onSavePostApprovalSchema(postApprovalSchema);
      }

      setHasUnsavedChanges(false);
      toast.success("All settings saved successfully!");
    } catch (error) {
      errorManager("Failed to save program settings", error, {
        programId,
        schemaFieldsCount: schema.fields?.length,
      });
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Program Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your funding program in one place. Expand each section to customize.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* Program Details */}
        <CollapsibleSection
          title="Program Details"
          description="Name, description, dates, and budget"
          status={sectionStatuses.programDetails}
          icon={<DocumentTextIcon className="w-5 h-5" />}
          defaultOpen={true}
        >
          <ProgramDetailsSection
            programId={programId}
            chainId={chainId}
            readOnly={readOnly}
          />
        </CollapsibleSection>

        {/* Application Form */}
        <CollapsibleSection
          title="Application Form"
          description="Build the form applicants will fill out"
          status={sectionStatuses.applicationForm.status}
          statusText={sectionStatuses.applicationForm.text}
          icon={<WrenchScrewdriverIcon className="w-5 h-5" />}
          defaultOpen={false}
        >
          <ApplicationFormSection
            schema={schema}
            onUpdate={handleSchemaUpdate}
            readOnly={readOnly}
          />
        </CollapsibleSection>

        {/* Review & Evaluation */}
        <CollapsibleSection
          title="Review & Evaluation"
          description="Reviewers and AI scoring configuration"
          status={sectionStatuses.reviewEvaluation.status}
          statusText={sectionStatuses.reviewEvaluation.text}
          icon={<UserGroupIcon className="w-5 h-5" />}
          defaultOpen={false}
        >
          <ReviewEvaluationSection
            programId={programId}
            chainId={chainId}
            communityId={communityId}
            schema={schema}
            onSchemaUpdate={handleSchemaUpdate}
            readOnly={readOnly}
          />
        </CollapsibleSection>

        {/* Post-Approval Workflow */}
        <CollapsibleSection
          title="Post-Approval Workflow"
          description="Additional form for approved applicants"
          status={sectionStatuses.postApproval.status}
          statusText={sectionStatuses.postApproval.text}
          icon={<CheckCircleIcon className="w-5 h-5" />}
          defaultOpen={false}
        >
          <PostApprovalSection
            schema={postApprovalSchema}
            onUpdate={handlePostApprovalSchemaUpdate}
            readOnly={readOnly}
          />
        </CollapsibleSection>

        {/* Communication */}
        <CollapsibleSection
          title="Communication"
          description="Email templates and success page"
          status={sectionStatuses.communication.status}
          statusText={sectionStatuses.communication.text}
          icon={<EnvelopeIcon className="w-5 h-5" />}
          defaultOpen={false}
        >
          <CommunicationSection
            schema={schema}
            onUpdate={handleSchemaUpdate}
            programId={programId}
            readOnly={readOnly}
          />
        </CollapsibleSection>

        {/* Privacy & Visibility */}
        <CollapsibleSection
          title="Privacy & Visibility"
          description="Control who can see applications"
          status={sectionStatuses.privacy.status}
          statusText={sectionStatuses.privacy.text}
          icon={<EyeSlashIcon className="w-5 h-5" />}
          defaultOpen={false}
        >
          <PrivacySection
            schema={schema}
            onUpdate={handleSchemaUpdate}
            readOnly={readOnly}
          />
        </CollapsibleSection>
      </div>

      {/* Sticky Save Bar */}
      {!readOnly && (
        <div className="sticky bottom-0 mt-8 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {hasUnsavedChanges ? (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  You have unsaved changes
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400">All changes saved</span>
              )}
            </div>
            <Button
              onClick={handleSaveAll}
              disabled={isSaving || !hasUnsavedChanges}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Saving...
                </>
              ) : (
                "Save All Changes"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
