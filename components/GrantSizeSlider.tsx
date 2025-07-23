import * as Popover from "@radix-ui/react-popover";
import Slider from "rc-slider";
import type { FC } from "react";
import formatCurrency from "@/utilities/formatCurrency";
import { ChevronDown } from "./Icons/ChevronDown";
import { registryHelper } from "./Pages/ProgramRegistry/helper";

interface SliderProps {
	value: number[];
	onChangeListener: (value: number[]) => void;
}

export const GrantSizeSlider: FC<SliderProps> = ({
	value,
	onChangeListener,
}) => {
	return (
		<Popover.Root>
			<Popover.Trigger className="relative max-w-40 w-full hover:bg-white cursor-default rounded-md bg-white dark:bg-zinc-800 dark:text-zinc-100 py-3 pl-4 pr-12 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
				<p className="block truncate font-normal">Grant Size</p>
				<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
					<ChevronDown className="h-5 w-5 text-black dark:text-white" />
				</span>
			</Popover.Trigger>
			<Popover.Content>
				<div className="flex flex-col gap-4 bg-white px-4 pt-2 pb-4 border mt-1 rounded-md min-w-52">
					<p>
						Grant Size: ${formatCurrency(value[0])} - $
						{formatCurrency(value[1])}
						{value[1].toString() === registryHelper.grantSizes[1].toString()
							? "+"
							: ""}
					</p>
					<Slider
						range
						className={"relative flex w-full items-center"}
						min={registryHelper.grantSizes[0]}
						max={registryHelper.grantSizes[1]}
						step={50000}
						value={value}
						onChange={(e: any) => onChangeListener(e)}
					/>
				</div>
			</Popover.Content>
		</Popover.Root>
	);
};
