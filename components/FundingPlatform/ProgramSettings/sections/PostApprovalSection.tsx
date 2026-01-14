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
import {
  Bars3Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import type React from "react";
import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FieldEditor } from "@/components/QuestionBuilder/FieldEditor";
import { FieldTypeSelector, fieldTypes } from "@/components/QuestionBuilder/FieldTypeSelector";
import { Button } from "@/components/Utilities/Button";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { errorManager } from "@/components/Utilities/errorManager";
import type { FormField, FormSchema } from "@/types/question-builder";

interface PostApprovalSectionProps {
  schema: FormSchema;
  onUpdate: (schema: FormSchema) => void;
  readOnly?: boolean;
}

export function PostApprovalSection({
  schema,
  onUpdate,
  readOnly = false,
}: PostApprovalSectionProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    if (readOnly) return;

    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: `New ${fieldType} field`,
      required: false,
      private: true, // Post-approval fields are always private
      options: ["select", "radio", "checkbox"].includes(fieldType)
        ? ["Option 1", "Option 2"]
        : undefined,
    };

    onUpdate({
      ...schema,
      fields: [...(schema.fields || []), newField],
    });
    setSelectedFieldId(newField.id);
  };

  const handleFieldUpdate = (updatedField: FormField) => {
    if (readOnly) return;
    onUpdate({
      ...schema,
      fields: (schema.fields || []).map((field) =>
        field.id === updatedField.id ? { ...updatedField, private: true } : field
      ),
    });
  };

  const handleFieldDelete = (fieldId: string) => {
    if (readOnly) return;
    onUpdate({
      ...schema,
      fields: (schema.fields || []).filter((field) => field.id !== fieldId),
    });
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
    delete fieldRefs.current[fieldId];
  };

  const handleFieldMove = (fieldId: string, direction: "up" | "down") => {
    if (readOnly || !schema.fields) return;

    const currentIndex = schema.fields.findIndex((field) => field.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= schema.fields.length) return;

    const newFields = [...schema.fields];
    const [movedField] = newFields.splice(currentIndex, 1);
    newFields.splice(newIndex, 0, movedField);

    onUpdate({ ...schema, fields: newFields });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    try {
      const { active, over } = event;
      if (!over || active.id === over.id || readOnly) return;

      const oldIndex = schema.fields.findIndex((field) => field.id === active.id);
      const newIndex = schema.fields.findIndex((field) => field.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onUpdate({
          ...schema,
          fields: arrayMove(schema.fields, oldIndex, newIndex),
        });
      }
    } catch (error) {
      errorManager("Failed to reorder form fields", error);
      toast.error("Failed to reorder fields.");
    }
  };

  const handleAddEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = newEmail.trim();

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const currentEmails = schema.emailNotifications || [];
    if (currentEmails.includes(trimmedEmail)) {
      toast.error("This email is already in the list.");
      return;
    }

    onUpdate({
      ...schema,
      emailNotifications: [...currentEmails, trimmedEmail],
    });
    setNewEmail("");
    toast.success("Email added!");
  };

  const handleRemoveEmail = (index: number) => {
    onUpdate({
      ...schema,
      emailNotifications: schema.emailNotifications?.filter((_, i) => i !== index) || [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
        <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Post-Approval Form
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            This form is shown to applicants after their application is approved. Use it to collect
            additional information like KYC details, payment info, or milestones. All fields are
            private by default.
          </p>
        </div>
      </div>

      {/* Form Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!readOnly && (
          <div className="lg:col-span-1">
            <FieldTypeSelector onFieldAdd={handleFieldAdd} isPostApprovalMode={true} />
          </div>
        )}

        <div className={readOnly ? "lg:col-span-3" : "lg:col-span-2"}>
          {!schema.fields || schema.fields.length === 0 ? (
            <div className="bg-white dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <PlusIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No post-approval fields yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Add fields to collect additional information from approved applicants.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={schema.fields.map((field) => field.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {schema.fields.map((field, index) => (
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
                      totalFields={schema.fields.length}
                      fieldRefs={fieldRefs}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          Email Notifications
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Get notified when post-approval forms are submitted.
        </p>

        {/* Email List */}
        {schema.emailNotifications && schema.emailNotifications.length > 0 && (
          <div className="space-y-2 mb-4">
            {schema.emailNotifications.map((email, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 dark:bg-zinc-700 px-4 py-2 rounded-lg"
              >
                <span className="text-sm text-gray-900 dark:text-white">{email}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Email */}
        {!readOnly && (
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEmail())}
              placeholder="admin@example.com"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
            />
            <Button onClick={handleAddEmail} className="px-4">
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Reuse the SortableFieldItem component (same as ApplicationFormSection)
interface SortableFieldItemProps {
  field: FormField;
  index: number;
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  handleFieldUpdate: (field: FormField) => void;
  handleFieldDelete: (fieldId: string) => void;
  handleFieldMove: (fieldId: string, direction: "up" | "down") => void;
  readOnly: boolean;
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
      className={`border rounded-lg transition-all bg-white dark:bg-zinc-800 ${
        selectedFieldId === field.id
          ? "border-blue-500 shadow-lg"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          {!readOnly && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2 -ml-2 mr-2 text-gray-400 hover:text-gray-600"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            className="flex-1 cursor-pointer bg-transparent border-none text-left"
            onClick={() => setSelectedFieldId(selectedFieldId === field.id ? null : field.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                    {fieldTypes.find((item) => item.type === field.type)?.label || field.type}
                  </span>
                  {field.required && <span className="text-xs text-red-500">Required</span>}
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    Private
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mt-1">{field.label}</h4>
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

        {selectedFieldId === field.id && (
          <div className="border-t border-gray-200 dark:border-gray-700 mt-4">
            <FieldEditor
              field={field}
              onUpdate={handleFieldUpdate}
              onDelete={handleFieldDelete}
              readOnly={readOnly}
              onMoveUp={index === 0 ? undefined : (id: string) => handleFieldMove(id, "up")}
              onMoveDown={
                index === totalFields - 1 ? undefined : (id: string) => handleFieldMove(id, "down")
              }
              isPostApprovalMode={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
