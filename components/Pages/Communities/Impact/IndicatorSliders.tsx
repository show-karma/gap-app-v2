"use client";

import * as Slider from "@radix-ui/react-slider";
import type { IndicatorDistribution } from "@/services/projectDiscovery";
import type { ImpactIndicator } from "@/types/impactMeasurement";

interface IndicatorSlidersProps {
  indicators: ImpactIndicator[];
  indicatorDistribution: IndicatorDistribution;
  onChange: (indicatorId: string, newValue: number) => void;
}

export const IndicatorSliders = ({
  indicators,
  indicatorDistribution,
  onChange,
}: IndicatorSlidersProps) => (
  <div className="space-y-3 bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700 shadow-sm">
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
        Impact Distribution
      </h3>
      <p className="text-sm text-gray-600 dark:text-zinc-400">
        Adjust the sliders to set the weight for each indicators.
      </p>
    </div>
    <div className="space-y-8">
      {indicators.map((indicator) => (
        <div key={indicator.id} className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-900 dark:text-zinc-100">{indicator.name}</span>
            <span className="font-medium text-primary">
              {Math.round((indicatorDistribution[indicator.id] ?? 0) * 100)}%
            </span>
          </div>
          <Slider.Root
            className="relative flex w-full touch-none select-none items-center py-2"
            value={[(indicatorDistribution[indicator.id] ?? 0) * 100]}
            onValueChange={(values) => onChange(indicator.id, values[0] / 100)}
            max={100}
            step={1}
          >
            <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full">
              <Slider.Range className="absolute h-full" />
            </Slider.Track>
            <Slider.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-white shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </Slider.Root>
        </div>
      ))}
    </div>
  </div>
);
