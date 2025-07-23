import type { ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

// Had to change the bare bones to these packages because i was suffering some bugs due the old 'cn'
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
