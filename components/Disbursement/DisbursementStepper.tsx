"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import type React from "react";

export type DisbursementStep = "configure" | "upload" | "review";

interface DisbursementStepperProps {
  currentStep: DisbursementStep;
  completedSteps: DisbursementStep[];
}

const steps = [
  {
    id: "configure",
    name: "Configure",
    description: "Set Safe address and network",
    icon: "⚙️",
  },
  {
    id: "upload",
    name: "Upload CSV",
    description: "Upload recipient list",
    icon: "📄",
  },
  {
    id: "review",
    name: "Review & Disburse",
    description: "Review and execute",
    icon: "🚀",
  },
];

export const DisbursementStepper: React.FC<DisbursementStepperProps> = ({
  currentStep,
  completedSteps,
}) => {
  const getStepStatus = (stepId: DisbursementStep) => {
    if (completedSteps.includes(stepId)) {
      return "completed";
    } else if (stepId === currentStep) {
      return "current";
    } else {
      return "upcoming";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => {
            const status = getStepStatus(step.id as DisbursementStep);

            return (
              <li key={step.name} className="relative flex-1">
                <div className="flex flex-col items-center">
                  {status === "completed" ? (
                    <>
                      {stepIdx !== steps.length - 1 && (
                        <div
                          className="absolute top-5 left-1/2 w-full h-0.5 bg-gradient-to-r from-green-500 to-blue-500"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg transform hover:scale-110 transition-all duration-200">
                        <CheckIcon className="h-6 w-6 text-white" aria-hidden="true" />
                        <span className="sr-only">{step.name}</span>
                      </div>
                    </>
                  ) : status === "current" ? (
                    <>
                      {stepIdx !== steps.length - 1 && (
                        <div
                          className="absolute top-5 left-1/2 w-full h-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div
                        className="relative flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-500 bg-white shadow-lg"
                        aria-current="step"
                      >
                        <span className="text-lg" aria-hidden="true">
                          {step.icon}
                        </span>
                        <span className="sr-only">{step.name}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {stepIdx !== steps.length - 1 && (
                        <div
                          className="absolute top-5 left-1/2 w-full h-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition-all duration-200">
                        <span className="text-lg opacity-50" aria-hidden="true">
                          {step.icon}
                        </span>
                        <span className="sr-only">{step.name}</span>
                      </div>
                    </>
                  )}
                  <div className="mt-4 text-center">
                    <span
                      className={`text-sm font-semibold block ${
                        status === "completed"
                          ? "text-green-600"
                          : status === "current"
                            ? "text-blue-600"
                            : "text-gray-500"
                      }`}
                    >
                      {step.name}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 block max-w-24 mx-auto">
                      {step.description}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};
