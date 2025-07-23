"use client";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";

type CopiedValue = string | null;

type CopyFn = (text: string, message?: string) => Promise<boolean>;

export function useCopyToClipboard(): [CopiedValue, CopyFn] {
	const [copiedText, setCopiedText] = useState<CopiedValue>(null);

	const copy: CopyFn = useCallback(
		async (text, message = "Copied to clipboard") => {
			if (!navigator?.clipboard) {
				console.warn("Clipboard not supported");
				return false;
			}

			// Try to save to clipboard then save it in the state if worked
			try {
				await navigator.clipboard.writeText(text);
				setCopiedText(text);
				toast.success(message);
				return true;
			} catch (error: any) {
				errorManager("Copy to clipboard failed", error);
				console.warn("Copy failed", error);
				setCopiedText(null);
				return false;
			}
		},
		[],
	);

	return [copiedText, copy];
}
