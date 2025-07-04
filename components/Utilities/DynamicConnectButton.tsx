"use client";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";

interface DynamicConnectButtonProps {
  buttonClassName?: string;
  children?: (props: {
    openConnectModal: () => void;
    mounted: boolean;
  }) => React.ReactNode;
  variant?: "widget" | "custom";
}

const DynamicConnectButton = ({
  buttonClassName,
  children,
  variant = "widget",
}: DynamicConnectButtonProps) => {
  const { setShowAuthFlow } = useDynamicContext();
  const defaultButtonClass =
    "rounded-md border border-brand-blue dark:bg-zinc-900 dark:text-blue-500 bg-white px-3 py-2 text-sm font-semibold text-brand-blue hover:bg-opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

  // If using the widget variant, return the DynamicWidget
  if (variant === "widget" || !children) {
    return (
      <div className="inline-block">
        <DynamicWidget
          variant="modal"
          buttonClassName={buttonClassName || defaultButtonClass}
        />
      </div>
    );
  }

  const openConnectModal = () => {
    setShowAuthFlow?.(true);
  };

  return (
    <div className="inline-flex items-center gap-2">
      {children?.({
        openConnectModal,
        mounted: true,
      })}
    </div>
  );
};

export default DynamicConnectButton;
