import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { FC } from "react";

interface Props {
  currentTheme: string | undefined;
  onClick: () => void;
}

export const ColorModeToggle: FC<Props> = ({ currentTheme, onClick }) => {
  return (
    <button
      className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:bg-white dark:focus:bg-black focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-500"
      onClick={onClick}
    >
      {currentTheme === "dark" ? (
        <SunIcon className="h-6 w-6 text-gray-500 dark:text-zinc-200" />
      ) : (
        <MoonIcon className="h-6 w-6 text-gray-500 dark:text-zinc-200" />
      )}
    </button>
  );
};
