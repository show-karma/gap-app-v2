'use client';

import React from 'react';
import { FormField } from '@/types/question-builder';

interface FieldTypeSelectorProps {
  onFieldAdd: (fieldType: FormField['type']) => void;
}

const fieldTypes = [
  { type: 'text' as const, label: 'Text Input', icon: '📝', description: 'Single line text input' },
  { type: 'textarea' as const, label: 'Textarea', icon: '📄', description: 'Multi-line text input' },
  { type: 'select' as const, label: 'Dropdown', icon: '📋', description: 'Select from options' },
  { type: 'radio' as const, label: 'Radio Buttons', icon: '🔘', description: 'Choose one option' },
  { type: 'checkbox' as const, label: 'Checkboxes', icon: '☑️', description: 'Choose multiple options' },
  { type: 'number' as const, label: 'Number', icon: '🔢', description: 'Numeric input' },
  { type: 'email' as const, label: 'Email', icon: '📧', description: 'Email address input' },
  { type: 'url' as const, label: 'URL', icon: '🔗', description: 'Website URL input' },
  { type: 'date' as const, label: 'Date', icon: '📅', description: 'Date picker' },
];

export function FieldTypeSelector({ onFieldAdd }: FieldTypeSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Add Form Field
      </h3>
      
      <div className="grid grid-cols-1 gap-2">
        {fieldTypes.map((fieldType) => (
          <button
            key={fieldType.type}
            onClick={() => onFieldAdd(fieldType.type)}
            className="flex items-center p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl mr-3">{fieldType.icon}</span>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {fieldType.label}
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