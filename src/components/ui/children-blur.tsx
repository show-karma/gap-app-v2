import { useCallback } from "react";

export const ChildrenBlur = ({
  children,
  onBlur,
  ...props
}: {
  children: React.ReactNode;
  onBlur: () => void;
  [key: string]: any;
}) => {
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const currentTarget = e.currentTarget;

      // Give browser time to focus the next element
      requestAnimationFrame(() => {
        // Check if the new focused element is a child of the original container
        if (!currentTarget.contains(document.activeElement)) {
          onBlur();
        }
      });
    },
    [onBlur]
  );

  return (
    <div {...props} onBlur={handleBlur}>
      {children}
    </div>
  );
};
