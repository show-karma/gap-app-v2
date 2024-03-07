import type { FC } from "react";
import { SimpleSpinner } from "./SimpleSpinner";
import { cn } from "@/utilities/tailwind";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export const Button: FC<ButtonProps> = ({
  children,
  isLoading,
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        "rounded-md bg-primary-600 flex flex-row items-center px-3 py-2 text-sm font-semibold text-white  hover:bg-brand-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600  disabled:opacity-35  hover:opacity-75 transition-all ease-in-out duration-300",
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
