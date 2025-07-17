import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import React from "react";

interface Props {
  heading: string;
  children: React.ReactNode;
}

export default function NotFound({ heading, children }: Props) {
  return (
    <div className="col-span-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon
            className="h-8 w-8 text-yellow-400 dark:text-yellow-600"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <h1 className="text-2xl font-medium text-yellow-600 dark:text-yellow-500">
            {heading}
          </h1>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-600">
            <p>{children}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
