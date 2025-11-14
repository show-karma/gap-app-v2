"use client"

interface EmptyCartProps {
  onBrowseProjects: () => void
}

export function EmptyCart({ onBrowseProjects }: EmptyCartProps) {
  return (
    <div data-testid="empty-cart" className="flex flex-col items-center gap-6 py-16">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-full p-6">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-gray-400 dark:text-gray-500"
        >
          <path d="M3 6h18l-2 13H5L3 6z" />
          <path d="M8 21h8" />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Your cart is empty
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Add some projects to your donation cart to get started
        </p>
        <button
          onClick={onBrowseProjects}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Browse Projects
        </button>
      </div>
    </div>
  )
}
