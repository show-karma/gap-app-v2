"use client";

import type { FormField } from "@/types/question-builder";

interface FieldTypeSelectorProps {
  onFieldAdd: (fieldType: FormField["type"]) => void;
  isPostApprovalMode?: boolean;
}

export const fieldTypes = [
  {
    type: "text" as const,
    label: "Text Input",
    icon: "📝",
    description: "Single line text input",
  },
  {
    type: "textarea" as const,
    label: "Textarea",
    icon: "📄",
    description: "Multi-line text input",
  },
  {
    type: "select" as const,
    label: "Dropdown",
    icon: "📋",
    description: "Select from options",
  },
  {
    type: "radio" as const,
    label: "Radio Button",
    icon: "🔘",
    description: "Choose one option",
  },
  {
    type: "checkbox" as const,
    label: "Checkbox",
    icon: "☑️",
    description: "Choose multiple options",
  },
  {
    type: "number" as const,
    label: "Number",
    icon: "🔢",
    description: "Numeric input",
  },
  {
    type: "email" as const,
    label: "Email",
    icon: "📧",
    description: "Email address input",
  },
  {
    type: "url" as const,
    label: "URL",
    icon: "🔗",
    description: "Website URL input",
  },
  {
    type: "date" as const,
    label: "Date",
    icon: "📅",
    description: "Date picker",
  },
  {
    type: "milestone" as const,
    label: "Milestones",
    icon: "🎯",
    description:
      "Dynamic milestone management with title, description, due dates, funding requested, and completion criteria",
  },
];

export function FieldTypeSelector({
  onFieldAdd,
  isPostApprovalMode = false,
}: FieldTypeSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Form Field</h3>

      <div className="grid grid-cols-1 gap-2">
        {fieldTypes.map((fieldType) => (
          <button
            key={fieldType.type}
            onClick={() => onFieldAdd(fieldType.type)}
            className={`flex items-center p-3 text-left border rounded-lg transition-colors ${
              fieldType.type === "email" && !isPostApprovalMode
                ? "border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <span className="text-2xl mr-3">{fieldType.icon}</span>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 dark:text-white">{fieldType.label}</span>
                {fieldType.type === "email" && !isPostApprovalMode && (
                  <span className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full">
                    Required
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {fieldType.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
