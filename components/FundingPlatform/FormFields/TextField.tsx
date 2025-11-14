import type { FC } from "react"
import type { FieldError, UseFormRegister } from "react-hook-form"
import type { FormField } from "@/types/question-builder"

interface TextFieldProps {
  field: FormField
  register: UseFormRegister<any>
  error?: FieldError
  className?: string
  disabled?: boolean
}

export const TextField: FC<TextFieldProps> = ({
  field,
  register,
  error,
  className,
  disabled = false,
}) => {
  return (
    <div className={className}>
      <label
        htmlFor={field.id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{field.description}</p>
      )}

      <input
        id={field.id}
        type="text"
        placeholder={field.placeholder}
        disabled={disabled}
        {...register(field.id, {
          required: field.required ? `${field.label} is required` : false,
          minLength: field.validation?.min
            ? {
                value: field.validation.min,
                message: `Minimum ${field.validation.min} characters required`,
              }
            : undefined,
          maxLength: field.validation?.max
            ? {
                value: field.validation.max,
                message: `Maximum ${field.validation.max} characters allowed`,
              }
            : undefined,
          pattern: field.validation?.pattern
            ? {
                value: new RegExp(field.validation.pattern),
                message: field.validation.message || "Invalid format",
              }
            : undefined,
        })}
        className={`w-full rounded-lg border ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 dark:border-zinc-700 dark:focus:border-indigo-400"
        } bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-zinc-100 
        placeholder:text-gray-300 dark:placeholder:text-zinc-500
        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-opacity-50`}
      />

      {error && (
        <p className="text-red-500 text-sm mt-1" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}
