import type { FC } from "react";
import { SimpleSpinner } from "./simple-spinner";
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "custom";
}

export const Button: FC<ButtonProps> = ({
  children,
  isLoading,
  className,
  variant = "custom",
  ...props
}) => {
  const variantStyles = {
    primary: "bg-black text-white hover:opacity-75",
    secondary: "bg-white text-black border border-black hover:opacity-75",
    custom: "bg-brand-blue text-white hover:bg-brand-blue/80",
  };

  return (
    <button
      className={cn(
        "rounded-md flex flex-row items-center px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:opacity-35 transition-all ease-in-out duration-300",
        variantStyles[variant],
        className || ""
      )}
      type="button"
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <SimpleSpinner /> : null}
      {children}
    </button>
  );
};
