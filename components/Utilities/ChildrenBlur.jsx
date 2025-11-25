import { useCallback } from "react"

export const ChildrenBlur = ({ children, onBlur, ...props }) => {
  const handleBlur = useCallback(
    (e) => {
      const currentTarget = e.currentTarget

      // Give browser time to focus the next element
      requestAnimationFrame(() => {
        // Check if the new focused element is a child of the original container
        if (!currentTarget.contains(document.activeElement)) {
          onBlur()
        }
      })
    },
    [onBlur]
  )

  return (
    <fieldset {...props} onBlur={handleBlur}>
      {children}
    </fieldset>
  )
}
