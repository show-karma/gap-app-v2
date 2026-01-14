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
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import type React from "react";
import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FieldEditor } from "@/components/QuestionBuilder/FieldEditor";
import { FieldTypeSelector, fieldTypes } from "@/components/QuestionBuilder/FieldTypeSelector";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { errorManager } from "@/components/Utilities/errorManager";
import type { FormField, FormSchema } from "@/types/question-builder";

interface ApplicationFormSectionProps {
  schema: FormSchema;
  onUpdate: (schema: FormSchema) => void;
  readOnly?: boolean;
}

export function ApplicationFormSection({
  schema,
  onUpdate,
  readOnly = false,
}: ApplicationFormSectionProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const hasEmailField = schema.fields?.some(
    (field) => field.type === "email" || field.label.toLowerCase().includes("email")
  );

  // Scroll to selected field
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
      required: fieldType === "email",
      private: false,
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
        field.id === updatedField.id ? updatedField : field
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

  const handleTitleChange = (title: string) => {
    onUpdate({ ...schema, title });
  };

  const handleDescriptionChange = (description: string) => {
    onUpdate({ ...schema, description });
  };

  return (
    <div className="space-y-6">
      {/* Form Title & Description */}
      {!readOnly && (
        <div className="space-y-4 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Form Title
            </label>
            <input
              type="text"
              value={schema.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white"
              placeholder="Application Form Title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Form Description
            </label>
            <MarkdownEditor
              value={schema.description || ""}
              onChange={(value?: string) => handleDescriptionChange(value ?? "")}
              placeholderText="Describe what this application is for..."
              height={80}
              minHeight={60}
            />
          </div>
        </div>
      )}

      {/* Email Field Warning */}
      {!hasEmailField && schema.fields && schema.fields.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Email Field Required
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Add an email field so you can communicate with applicants.
            </p>
          </div>
        </div>
      )}

      {/* Two Column Layout: Field Types + Form Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Field Type Selector */}
        {!readOnly && (
          <div className="lg:col-span-1">
            <FieldTypeSelector onFieldAdd={handleFieldAdd} isPostApprovalMode={false} />
          </div>
        )}

        {/* Form Fields List */}
        <div className={readOnly ? "lg:col-span-3" : "lg:col-span-2"}>
          {!schema.fields || schema.fields.length === 0 ? (
            <div className="bg-white dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <PlusIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No fields yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Add form fields from the panel on the left to build your application form.
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
      } ${isDragging ? "z-50" : ""}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Drag Handle */}
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
                  {field.private && (
                    <span className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                      Private
                    </span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mt-1">{field.label}</h4>
                {field.description && (
                  <MarkdownPreview
                    className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1"
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

        {/* Field Editor */}
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
              isPostApprovalMode={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
