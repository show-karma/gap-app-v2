import type React from "react"

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "disabled"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
  href?: string
  external?: boolean
  className?: string
  icon?: React.ReactNode
  loadingText?: string
}

const baseClasses =
  "inline-flex items-center border border-transparent font-medium rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"

const variantClasses = {
  primary:
    "text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500 transform hover:scale-105",
  secondary: "text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-indigo-500",
  danger:
    "text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500",
  success:
    "text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:ring-green-500",
  disabled: "bg-gray-400 text-white cursor-not-allowed",
}

const sizeClasses = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg font-semibold rounded-xl shadow-lg",
}

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
)

const ExternalLinkIcon = () => (
  <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
)

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  children,
  onClick,
  href,
  external = false,
  className = "",
  icon,
  loadingText,
}) => {
  const buttonVariant = disabled || isLoading ? "disabled" : variant
  const classes = `${baseClasses} ${variantClasses[buttonVariant]} ${sizeClasses[size]} ${className}`

  const content = (
    <>
      {isLoading ? (
        <>
          <LoadingSpinner />
          {loadingText || children}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
          {external && <ExternalLinkIcon />}
        </>
      )}
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : "_self"}
        rel={external ? "noopener noreferrer" : undefined}
        className={classes}
      >
        {content}
      </a>
    )
  }

  return (
    <button type="button" disabled={disabled || isLoading} onClick={onClick} className={classes}>
      {content}
    </button>
  )
}
