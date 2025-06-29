'use client';

import React, { useState, useEffect } from 'react';
import { FormField, FormSchema } from '@/types/question-builder';
import { FieldTypeSelector } from './FieldTypeSelector';
import { FieldEditor } from './FieldEditor';
import { FormPreview } from './FormPreview';
import { Button } from '@/components/Utilities/Button';
import { EyeIcon, Cog6ToothIcon } from '@heroicons/react/24/solid';

interface QuestionBuilderProps {
  initialSchema?: FormSchema;
  onSave?: (schema: FormSchema) => void;
  className?: string;
}

export function QuestionBuilder({ initialSchema, onSave, className = '' }: QuestionBuilderProps) {
  const [schema, setSchema] = useState<FormSchema>(
    initialSchema || {
      id: `form_${Date.now()}`,
      title: 'New Application Form',
      description: 'Please fill out this application form',
      fields: [],
      settings: {
        submitButtonText: 'Submit Application',
        confirmationMessage: 'Thank you for your submission!',
      },
    }
  );

  const [activeTab, setActiveTab] = useState<'build' | 'preview'>('build');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Update schema when initialSchema changes (e.g., after loading from API)
  useEffect(() => {
    if (initialSchema) {
      setSchema({
        ...initialSchema,
        fields: Array.isArray(initialSchema.fields) ? initialSchema.fields : [],
      });
    }
  }, [initialSchema]);

  const handleFieldAdd = (fieldType: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: `New ${fieldType} field`,
      required: false,
      options: ['select', 'radio', 'checkbox'].includes(fieldType) ? ['Option 1', 'Option 2'] : undefined,
    };

    setSchema(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField],
    }));

    setSelectedFieldId(newField.id);
  };

  const handleFieldUpdate = (updatedField: FormField) => {
    setSchema(prev => ({
      ...prev,
      fields: (prev.fields || []).map(field => 
        field.id === updatedField.id ? updatedField : field
      ),
    }));
  };

  const handleFieldDelete = (fieldId: string) => {
    setSchema(prev => ({
      ...prev,
      fields: (prev.fields || []).filter(field => field.id !== fieldId),
    }));
    
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleFieldMove = (fieldId: string, direction: 'up' | 'down') => {
    if (!schema.fields) return;
    
    const currentIndex = schema.fields.findIndex(field => field.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= schema.fields.length) return;

    const newFields = [...schema.fields];
    const [movedField] = newFields.splice(currentIndex, 1);
    newFields.splice(newIndex, 0, movedField);

    setSchema(prev => ({
      ...prev,
      fields: newFields,
    }));
  };

  const handleTitleChange = (title: string) => {
    setSchema(prev => ({ ...prev, title }));
  };

  const handleDescriptionChange = (description: string) => {
    setSchema(prev => ({ ...prev, description }));
  };

  const handleSave = () => {
    onSave?.(schema);
  };

  const handleFormSubmit = (data: Record<string, any>) => {
    console.log('Form preview submission:', data);
    alert(schema.settings.confirmationMessage);
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <input
                value={schema.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-xl font-bold bg-transparent border-none text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-0 w-full"
                placeholder="Form Title"
              />
              <textarea
                value={schema.description || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className="mt-1 text-sm bg-transparent border-none text-gray-600 dark:text-gray-400 placeholder:text-gray-400 focus:outline-none focus:ring-0 w-full resize-none"
                placeholder="Form description"
                rows={1}
              />
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg">
                <button
                  onClick={() => setActiveTab('build')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'build'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Cog6ToothIcon className="w-4 h-4 mr-2" />
                  Build
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <EyeIcon className="w-4 h-4 mr-2" />
                  Preview
                </button>
              </div>

              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                Save Form
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'build' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 sm:p-6 lg:p-8">
            {/* Field Types Panel */}
            <div className="lg:col-span-1">
              <FieldTypeSelector onFieldAdd={handleFieldAdd} />
            </div>

            {/* Form Builder */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {!schema.fields || schema.fields.length === 0 ? (
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
                  (schema.fields || []).map((field, index) => (
                    <div
                      key={field.id}
                      className={`border-2 rounded-lg transition-colors ${
                        selectedFieldId === field.id
                          ? 'border-blue-500'
                          : 'border-transparent'
                      }`}
                      onClick={() => setSelectedFieldId(field.id)}
                    >
                      {selectedFieldId === field.id ? (
                        <FieldEditor
                          field={field}
                          onUpdate={handleFieldUpdate}
                          onDelete={handleFieldDelete}
                          onMoveUp={index > 0 ? () => handleFieldMove(field.id, 'up') : undefined}
                          onMoveDown={index < (schema.fields?.length || 0) - 1 ? () => handleFieldMove(field.id, 'down') : undefined}
                        />
                      ) : (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {field.label}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {field.type} {field.required && '(Required)'}
                              </p>
                            </div>
                            <div className="text-gray-400">
                              Click to edit
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto">
              <FormPreview schema={schema} onSubmit={handleFormSubmit} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}