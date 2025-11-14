"use client"
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid"
import { useTheme } from "next-themes"

export default function ThemeButton() {
  const { theme: currentTheme, setTheme: changeCurrentTheme } = useTheme()
  return (
    <button
      className="px-3 py-2.5 rounded-md bg-white dark:bg-zinc-900 text-sm font-semibold text-gray-900 dark:text-white  ring-1 ring-inset ring-gray-300 dark:ring-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-primary-600"
      // onClick={() => toggleTheme()}
      onClick={() => changeCurrentTheme(currentTheme === "light" ? "dark" : "light")}
    >
      {currentTheme === "dark" ? (
        <SunIcon className="h-6 w-6 text-gray-500 dark:text-zinc-200" />
      ) : (
        <MoonIcon className="h-6 w-6 text-gray-500 dark:text-zinc-200" />
      )}
    </button>
  )
}
