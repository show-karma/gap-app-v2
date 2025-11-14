import React, { type FC, type ReactElement } from "react"

type GenericJSON = Record<string, unknown>

interface GenericJSONDisplayProps {
  data: GenericJSON
}

// Component to render generic JSON in a readable format
const GenericJSONDisplay: FC<GenericJSONDisplayProps> = ({ data }) => {
  const renderValue = (value: unknown, depth = 0): ReactElement => {
    // Handle different value types
    if (value === null || value === undefined) {
      return <span className="text-gray-400 dark:text-gray-500">null</span>
    }

    if (typeof value === "string") {
      return <span className="text-gray-700 dark:text-gray-300">{value}</span>
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-400 dark:text-gray-500">[]</span>
      }
      return (
        <div className={depth > 0 ? "ml-4" : ""}>
          {value.map((item, index) => (
            <div key={index} className="flex items-start gap-2 my-1">
              <span className="text-gray-400 dark:text-gray-500 select-none">•</span>
              {renderValue(item, depth + 1)}
            </div>
          ))}
        </div>
      )
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0) {
        return <span className="text-gray-400 dark:text-gray-500">{"{}"}</span>
      }
      return (
        <div className={depth > 0 ? "ml-4" : ""}>
          {entries.map(([key, val]) => (
            <div key={key} className="my-2">
              <span className="font-medium text-gray-600 dark:text-gray-400 capitalize">
                {key.replace(/_/g, " ")}:
              </span>{" "}
              {renderValue(val, depth + 1)}
            </div>
          ))}
        </div>
      )
    }

    return <span className="text-gray-500 dark:text-gray-400">{String(value)}</span>
  }

  // Special handling for common evaluation fields
  const getDecisionColor = (decision: string) => {
    const dec = decision.toLowerCase()
    if (dec === "reject" || dec === "rejected") return "text-red-600 dark:text-red-400"
    if (dec === "accept" || dec === "accepted" || dec === "approve" || dec === "approved")
      return "text-green-600 dark:text-green-400"
    if (dec === "pending" || dec === "review") return "text-yellow-600 dark:text-yellow-400"
    return "text-gray-700 dark:text-gray-300"
  }

  // Check if it has a decision field for special formatting
  const hasDecision = "decision" in data
  const decision = hasDecision ? String(data?.decision) : null

  return (
    <div className="space-y-3">
      {decision && (
        <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Decision</h4>
          <p className={`text-lg font-semibold ${getDecisionColor(decision)}`}>
            {decision.toUpperCase()}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => {
          // Skip decision if already displayed
          if (key === "decision" && hasDecision) return null

          return (
            <div key={key} className="py-2">
              <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize mb-1">
                {key.replace(/_/g, " ")}
              </h5>
              <div className="text-sm">{renderValue(value)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default GenericJSONDisplay
